(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.extractSongsFromDocument = api.extractSongsFromDocument;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const HEADER_TITLES = new Set(["song", "title", "曲名"]);
  const YT_MUSIC_ORIGIN = "https://music.youtube.com";
  const WATCH_LINK_SELECTOR = 'a[href*="watch?v="], a[href*="/watch"]';
  const TITLE_SELECTORS = [
    'ytmusic-responsive-list-item-flex-column-renderer:first-child a[title]',
    "ytmusic-responsive-list-item-flex-column-renderer:first-child a",
    'ytmusic-responsive-list-item-flex-column-renderer:first-child yt-formatted-string[title]',
    "ytmusic-responsive-list-item-flex-column-renderer:first-child yt-formatted-string",
    '.title-column yt-formatted-string[title]',
    ".title-column yt-formatted-string",
    '.title-column a[title]',
    ".title-column a",
    'yt-formatted-string.title[title]',
    "yt-formatted-string.title",
    ".title[title]",
    ".title",
    '#title a[title]',
    "#title a",
    "#title yt-formatted-string",
    'a[href*="watch?v="][title]',
    'a[href*="watch?v="]',
    'a[href*="/watch"][title]',
    'a[href*="/watch"]',
  ];

  function normalizeText(text) {
    return (text || "").replace(/\s+/g, " ").trim();
  }

  function getText(node) {
    if (!node) {
      return "";
    }

    const titleAttr = normalizeText(node.getAttribute && node.getAttribute("title"));
    if (titleAttr) {
      return titleAttr;
    }

    return normalizeText(node.innerText || node.textContent);
  }

  function isHeaderLikeTitle(title) {
    return HEADER_TITLES.has(title.toLowerCase());
  }

  function findFirstTitleBySelectors(rootNode, selectors) {
    for (const selector of selectors) {
      const node = rootNode.querySelector(selector);
      const text = getText(node);
      if (text && !isHeaderLikeTitle(text)) {
        return text;
      }
    }
    return "";
  }

  function findFirstTitleByFallback(rootNode) {
    const titleElements = Array.from(rootNode.querySelectorAll('[title], yt-formatted-string, a'));
    for (const node of titleElements) {
      const text = getText(node);
      if (!text || isHeaderLikeTitle(text)) {
        continue;
      }
      return text;
    }
    return "";
  }

  function extractTitleFromRow(row) {
    return findFirstTitleBySelectors(row, TITLE_SELECTORS) || findFirstTitleByFallback(row);
  }

  function parseUrl(rawUrl) {
    if (!rawUrl) {
      return null;
    }

    try {
      return new URL(rawUrl, YT_MUSIC_ORIGIN);
    } catch {
      return null;
    }
  }

  function getListIdFromUrl(rawUrl) {
    const parsed = parseUrl(rawUrl);
    if (!parsed) {
      return "";
    }
    return parsed.searchParams.get("list") || "";
  }

  function getCurrentListId(source) {
    const locationUrl = source && source.location && source.location.href;
    return getListIdFromUrl(locationUrl);
  }

  function getListIdFromHref(rawHref) {
    return getListIdFromUrl(rawHref);
  }

  function extractListIdFromNode(node) {
    if (!node || typeof node.getAttribute !== "function") {
      return "";
    }
    return getListIdFromHref(node.getAttribute("href"));
  }

  function getRowListId(row) {
    if (!row || typeof row.querySelector !== "function") {
      return "";
    }

    const link = row.querySelector('a[href*="watch?v="]') || row.querySelector('a[href*="/watch"]');
    return extractListIdFromNode(link);
  }

  function isHiddenNode(node, source) {
    if (!node || typeof node !== "object") {
      return true;
    }

    const view = source && source.defaultView;
    let current = node;
    while (current) {
      const isElement = current.nodeType === 1;
      if (isElement && current.hidden) {
        return true;
      }

      if (isElement && view && typeof view.getComputedStyle === "function") {
        const style = view.getComputedStyle(current);
        if (style && (style.display === "none" || style.visibility === "hidden")) {
          return true;
        }
      }
      current = current.parentElement || current.parentNode || null;
    }

    return false;
  }

  function isAllowedForListId(candidateListId, currentListId) {
    if (!currentListId) {
      return true;
    }
    if (!candidateListId) {
      return true;
    }
    return candidateListId === currentListId;
  }

  function collectTitlesFromRows(rows, currentListId, source, enforceListFilter) {
    const seen = new Set();
    const titles = [];

    for (const row of rows) {
      if (isHiddenNode(row, source)) {
        continue;
      }

      if (enforceListFilter && currentListId) {
        const rowListId = getRowListId(row);
        if (!isAllowedForListId(rowListId, currentListId)) {
          continue;
        }
      }

      const title = extractTitleFromRow(row);
      if (!title || seen.has(title)) {
        continue;
      }
      seen.add(title);
      titles.push(title);
    }

    return titles;
  }

  function collectFallbackTitles(source, currentListId) {
    const seen = new Set();
    const titles = [];
    const fallbackLinks = Array.from(source.querySelectorAll(WATCH_LINK_SELECTOR));

    for (const link of fallbackLinks) {
      if (isHiddenNode(link, source)) {
        continue;
      }

      const linkListId = extractListIdFromNode(link);
      if (!isAllowedForListId(linkListId, currentListId)) {
        continue;
      }

      const title = getText(link);
      if (!title || seen.has(title) || isHeaderLikeTitle(title)) {
        continue;
      }
      seen.add(title);
      titles.push(title);
    }

    return titles;
  }

  function extractSongsFromDocument(doc) {
    const source = doc || document;
    const rows = Array.from(source.querySelectorAll("ytmusic-responsive-list-item-renderer"));
    const currentListId = getCurrentListId(source);
    const strictTitles = collectTitlesFromRows(rows, currentListId, source, true);
    if (strictTitles.length > 0) {
      return strictTitles;
    }

    if (currentListId) {
      const relaxedTitles = collectTitlesFromRows(rows, currentListId, source, false);
      if (relaxedTitles.length > 0) {
        return relaxedTitles;
      }
    }

    const fallbackTitles = collectFallbackTitles(source, currentListId);
    if (fallbackTitles.length > 0) {
      return fallbackTitles;
    }

    return strictTitles;
  }

  return {
    extractSongsFromDocument,
  };
});
