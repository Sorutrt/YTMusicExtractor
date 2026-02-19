(function (root, factory) {
  const api = factory();

  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }

  root.isExtractableUrl = api.isExtractableUrl;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  function isExtractableUrl(rawUrl) {
    if (!rawUrl) {
      return false;
    }

    let url;
    try {
      url = new URL(rawUrl);
    } catch {
      return false;
    }

    if (url.hostname !== "music.youtube.com") {
      return false;
    }

    if (url.pathname.startsWith("/browse/")) {
      return true;
    }

    if (url.pathname === "/playlist" && url.searchParams.has("list")) {
      return true;
    }

    if (url.pathname === "/watch" && url.searchParams.has("list")) {
      return true;
    }

    return false;
  }

  return {
    isExtractableUrl,
  };
});
