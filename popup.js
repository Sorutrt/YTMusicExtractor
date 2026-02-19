const api = globalThis.browser || globalThis.chrome;
const extractButton = document.getElementById("extract-btn");
const copyButton = document.getElementById("copy-btn");
const resultContainer = document.getElementById("result-container");
const statusMessage = document.getElementById("status-msg");
const canUseUrl = typeof isExtractableUrl === "function" ? isExtractableUrl : () => false;
const RETRY_MAX_ATTEMPTS = 20;
const RETRY_WAIT_MS = 250;
const RETRY_SCROLL_EVERY = 4;
const RETRY_SCROLL_AMOUNT = 400;

let lastTabUrl = "";

function resetResults() {
  resultContainer.style.display = "none";
  copyButton.style.display = "none";
  resultContainer.textContent = "";
}

function getUnsupportedMessage() {
  return "アルバム/EP/プレイリストページで実行してください";
}

function toErrorMessage(error) {
  return String((error && error.message) || error);
}

function formatNoResultsStatus(payload) {
  const rows = payload.stats && typeof payload.stats.rows === "number" ? payload.stats.rows : "?";
  const links = payload.stats && typeof payload.stats.watchLinks === "number" ? payload.stats.watchLinks : "?";
  const detail = payload.error ? ` err:${payload.error}` : "";
  return `曲が見つかりませんでした（${payload.attempt}回試行 / rows:${rows} links:${links}${detail}）。`;
}

function showResults(titles, attempt) {
  const formattedList = titles.map((title, index) => `${index + 1}. ${title}`).join("\n");
  resultContainer.textContent = formattedList;
  resultContainer.style.display = "block";
  copyButton.style.display = "block";
  statusMessage.textContent = `${titles.length}件抽出しました（${attempt}回目）`;
}

async function executeScript(target, options) {
  return api.scripting.executeScript({
    target,
    ...options,
  });
}

function sleep(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function extractOnce(tabId) {
  const result = await executeScript(
    { tabId },
    {
      func: () => {
        const stats = {
          rows: document.querySelectorAll("ytmusic-responsive-list-item-renderer").length,
          watchLinks: document.querySelectorAll('a[href*="watch?v="], a[href*="/watch"]').length,
          path: location.pathname + location.search,
        };

        if (typeof extractSongsFromDocument !== "function") {
          return { titles: [], stats, error: "extractor_not_loaded" };
        }

        try {
          const titles = extractSongsFromDocument(document);
          return {
            titles: Array.isArray(titles) ? titles : [],
            stats,
            error: null,
          };
        } catch (error) {
          return {
            titles: [],
            stats,
            error: String((error && error.message) || error),
          };
        }
      },
    }
  );

  const payload = result && result[0] && result[0].result;
  if (!payload || !Array.isArray(payload.titles)) {
    return { titles: [], stats: null, error: "invalid_payload" };
  }
  return payload;
}

async function extractWithRetry(tabId) {
  let lastPayload = { titles: [], stats: null, error: "no_result" };

  for (let attempt = 0; attempt < RETRY_MAX_ATTEMPTS; attempt += 1) {
    const payload = await extractOnce(tabId);
    lastPayload = payload;

    if (payload.titles.length > 0) {
      return { ...payload, attempt: attempt + 1 };
    }

    if (attempt % RETRY_SCROLL_EVERY === RETRY_SCROLL_EVERY - 1) {
      await executeScript(
        { tabId },
        {
          func: (scrollAmount) => {
            window.scrollBy(0, scrollAmount);
          },
          args: [RETRY_SCROLL_AMOUNT],
        }
      );
    }

    await sleep(RETRY_WAIT_MS);
  }

  return { ...lastPayload, attempt: RETRY_MAX_ATTEMPTS };
}

async function getActiveTab() {
  const tabs = await api.tabs.query({ active: true, currentWindow: true });
  return tabs[0] || null;
}

function isTabExtractable(tab) {
  if (!tab || !tab.id) {
    return false;
  }

  return canUseUrl(tab.url || "");
}

async function syncPopupState() {
  const tab = await getActiveTab();
  const currentUrl = (tab && tab.url) || "";

  if (currentUrl !== lastTabUrl) {
    resetResults();
    lastTabUrl = currentUrl;
  }

  if (!tab || !tab.id) {
    extractButton.disabled = true;
    statusMessage.textContent = "アクティブなタブを取得できませんでした";
    return null;
  }

  if (!isTabExtractable(tab)) {
    extractButton.disabled = true;
    statusMessage.textContent = getUnsupportedMessage();
    return null;
  }

  extractButton.disabled = false;
  if (!resultContainer.textContent) {
    statusMessage.textContent = "";
  }
  return tab;
}

function registerTabWatchers() {
  if (!api.tabs || !api.tabs.onActivated || !api.tabs.onUpdated) {
    return;
  }

  api.tabs.onActivated.addListener(() => {
    void syncPopupState();
  });

  api.tabs.onUpdated.addListener((_tabId, changeInfo) => {
    if (changeInfo.url || changeInfo.status === "complete") {
      void syncPopupState();
    }
  });
}

extractButton.addEventListener("click", async () => {
  try {
    statusMessage.textContent = "";
    const tab = await syncPopupState();
    if (!tab) {
      return;
    }

    resetResults();

    const target = { tabId: tab.id };
    await executeScript(target, { files: ["extractor.js"] });
    const payload = await extractWithRetry(tab.id);
    const titles = payload.titles;
    if (titles.length === 0) {
      statusMessage.textContent = formatNoResultsStatus(payload);
      return;
    }

    showResults(titles, payload.attempt);
  } catch (error) {
    statusMessage.textContent = `抽出に失敗しました: ${toErrorMessage(error)}`;
  }
});

copyButton.addEventListener("click", () => {
  const text = resultContainer.textContent;
  navigator.clipboard.writeText(text).then(() => {
    const originalText = copyButton.textContent;
    copyButton.textContent = "コピー完了！";
    setTimeout(() => {
      copyButton.textContent = originalText;
    }, 2000);
  });
});

void syncPopupState();
registerTabWatchers();

