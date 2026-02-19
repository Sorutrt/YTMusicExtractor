(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.extractSongsFromDocument = api.extractSongsFromDocument;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const HEADER_TITLES = new Set(["song", "title", "曲名"]);

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
      '.title-column yt-formatted-string[title]',
      ".title-column yt-formatted-string",
      'yt-formatted-string.title[title]',
      "yt-formatted-string.title",
      'a[href*="watch?v="][title]',
      'a[href*="watch?v="]',
    ];

    for (const selector of candidates) {
      const node = row.querySelector(selector);
      const text = getText(node);
      if (text && !isHeaderLikeTitle(text)) {
        return text;
      }
    }

    return "";
  }

  function extractSongsFromDocument(doc) {
    const source = doc || document;
    const rows = Array.from(source.querySelectorAll("ytmusic-responsive-list-item-renderer"));
    const seen = new Set();
    const titles = [];

    for (const row of rows) {
      const title = extractTitleFromRow(row);
      if (!title || seen.has(title)) {
        continue;
      }
      seen.add(title);
      titles.push(title);
    }

    if (titles.length > 0) {
      return titles;
    }

    const fallbackLinks = Array.from(source.querySelectorAll('a[href*="watch?v="]'));
    for (const link of fallbackLinks) {
      const title = getText(link);
      if (!title || seen.has(title) || isHeaderLikeTitle(title)) {
        continue;
      }
      seen.add(title);
      titles.push(title);
    }

    return titles;
  }

  return {
    extractSongsFromDocument,
  };
});
