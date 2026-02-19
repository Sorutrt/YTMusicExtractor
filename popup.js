const api = globalThis.browser || globalThis.chrome;
const extractButton = document.getElementById("extract-btn");
const copyButton = document.getElementById("copy-btn");
const resultContainer = document.getElementById("result-container");
const statusMessage = document.getElementById("status-msg");

async function executeScript(target, options) {
  return api.scripting.executeScript({
    target,
    ...options,
  });
}

extractButton.addEventListener("click", async () => {
  try {
    statusMessage.textContent = "";
    resultContainer.style.display = "none";
    copyButton.style.display = "none";
    resultContainer.textContent = "";

    const tabs = await api.tabs.query({ active: true, currentWindow: true });
    const tab = tabs[0];
    const url = tab && tab.url ? tab.url : "";

    if (!tab || !tab.id) {
      statusMessage.textContent = "アクティブなタブを取得できませんでした";
      return;
    }

    if (url && !url.includes("music.youtube.com")) {
      statusMessage.textContent = "YouTube Musicのページで実行してください";
      return;
    }

    const target = { tabId: tab.id };
    await executeScript(target, { files: ["extractor.js"] });
    const results = await executeScript(target, {
      func: () => {
        if (typeof extractSongsFromDocument !== "function") {
          return [];
        }
        return extractSongsFromDocument(document);
      },
    });

    const titles = (results && results[0] && results[0].result) || [];
    if (titles.length === 0) {
      statusMessage.textContent = "曲が見つかりませんでした。ページをスクロールしてみてください。";
      return;
    }

    const formattedList = titles.map((title, index) => `${index + 1}. ${title}`).join("\n");
    resultContainer.textContent = formattedList;
    resultContainer.style.display = "block";
    copyButton.style.display = "block";
    statusMessage.textContent = `${titles.length}件抽出しました`;
  } catch (error) {
    statusMessage.textContent = `抽出に失敗しました: ${error.message || error}`;
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

