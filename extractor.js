(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.extractSongsFromDocument = api.extractSongsFromDocument;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const HEADER_TITLES = new Set(["song", "title", "曲名"]);
  const YT_MUSIC_ORIGIN = "https://music.youtube.com";

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

  function extractTitleFromRow(row) {
    const candidates = [
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

    for (const selector of candidates) {
      const node = row.querySelector(selector);
      const text = getText(node);
      if (text && !isHeaderLikeTitle(text)) {
        return text;
      }
    }

    const titleElements = Array.from(row.querySelectorAll('[title], yt-formatted-string, a'));
    for (const node of titleElements) {
      const text = getText(node);
      if (!text || isHeaderLikeTitle(text)) {
        continue;
      }
      return text;
    }

    return "";
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

  function getCurrentListId(source) {
    const locationUrl = source && source.location && source.location.href;
    const parsed = parseUrl(locationUrl);
    if (!parsed) {
      return "";
    }
    return parsed.searchParams.get("list") || "";
  }

  function getListIdFromHref(rawHref) {
    const parsed = parseUrl(rawHref);
    if (!parsed) {
      return "";
    }
    return parsed.searchParams.get("list") || "";
  }

  function getRowListId(row) {
    if (!row || typeof row.querySelector !== "function") {
      return "";
    }

    const link = row.querySelector('a[href*="watch?v="]') || row.querySelector('a[href*="/watch"]');
    if (!link || typeof link.getAttribute !== "function") {
      return "";
    }

    const href = link.getAttribute("href");
    return getListIdFromHref(href);
  }

  function isHiddenNode(node, source) {
    if (!node || typeof node !== "object") {
      return true;
    }

    const view = source && source.defaultView;
    let current = node;
    while (current) {
      const isElement = current && current.nodeType === 1;

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

  function collectTitlesFromRows(rows, currentListId, source, useListFilter) {
    const seen = new Set();
    const titles = [];

    for (const row of rows) {
      if (isHiddenNode(row, source)) {
        continue;
      }

      if (useListFilter && currentListId) {
        const rowListId = getRowListId(row);
        if (rowListId && rowListId !== currentListId) {
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

  function extractSongsFromDocument(doc) {
    const source = doc || document;
    const rows = Array.from(source.querySelectorAll("ytmusic-responsive-list-item-renderer"));
    const currentListId = getCurrentListId(source);
    const titles = collectTitlesFromRows(rows, currentListId, source, true);

    if (titles.length === 0 && currentListId) {
      const relaxedTitles = collectTitlesFromRows(rows, currentListId, source, false);
      if (relaxedTitles.length > 0) {
        return relaxedTitles;
      }
    } else if (titles.length > 0) {
      return titles;
    }

    const fallbackLinks = Array.from(source.querySelectorAll('a[href*="watch?v="], a[href*="/watch"]'));
    const fallbackSeen = new Set();
    const fallbackTitles = [];

    for (const link of fallbackLinks) {
      if (isHiddenNode(link, source)) {
        continue;
      }

      if (currentListId) {
        const href = typeof link.getAttribute === "function" ? link.getAttribute("href") : "";
        const listId = getListIdFromHref(href);
        if (listId && listId !== currentListId) {
          continue;
        }
      }

      const title = getText(link);
      if (!title || fallbackSeen.has(title) || isHeaderLikeTitle(title)) {
        continue;
      }
      fallbackSeen.add(title);
      fallbackTitles.push(title);
    }

    if (fallbackTitles.length > 0) {
      return fallbackTitles;
    }

    return titles;
  }

  return {
    extractSongsFromDocument,
  };
});
