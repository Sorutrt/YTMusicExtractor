const assert = require("node:assert/strict");
const { extractSongsFromDocument } = require("./extractor");

function createNode({ text = "", title = "", href = "", children = {} } = {}) {
  return {
    nodeType: 1,
    innerText: text,
    textContent: text,
    getAttribute(name) {
      if (name === "title") {
        return title || null;
      }
      if (name === "href") {
        return href || null;
      }
      return null;
    },
    querySelector(selector) {
      return children[selector] || null;
    },
  };
}

function createRow(childBySelector) {
  return {
    nodeType: 1,
    hidden: false,
    parentElement: null,
    getClientRects() {
      return [{}];
    },
    querySelector(selector) {
      return childBySelector[selector] || null;
    },
    querySelectorAll() {
      return [];
    },
  };
}

function runTests() {
  {
    const firstAnchor = createNode({ title: "Song A", href: "/watch?v=aaa" });
    const secondAnchor = createNode({ text: "Song B", href: "/watch?v=bbb" });

    const rows = [
      createRow({
        'a[href*="watch?v="]': firstAnchor,
      }),
      createRow({
        'a[href*="watch?v="]': secondAnchor,
      }),
    ];

    const doc = {
      querySelectorAll(selector) {
        if (selector === "ytmusic-responsive-list-item-renderer") {
          return rows;
        }
        return [];
      },
    };

    const result = extractSongsFromDocument(doc);
    assert.deepEqual(result, ["Song A", "Song B"]);
  }

  {
    const first = createNode({ title: "Song A", href: "/watch?v=aaa" });
    const duplicate = createNode({ title: "Song A", href: "/watch?v=bbb" });
    const third = createNode({ title: "Song C", href: "/watch?v=ccc" });

    const rows = [
      createRow({ 'a[href*="watch?v="]': first }),
      createRow({ 'a[href*="watch?v="]': duplicate }),
      createRow({ 'a[href*="watch?v="]': third }),
    ];

    const doc = {
      querySelectorAll(selector) {
        if (selector === "ytmusic-responsive-list-item-renderer") {
          return rows;
        }
        return [];
      },
    };

    const result = extractSongsFromDocument(doc);
    assert.deepEqual(result, ["Song A", "Song C"]);
  }

  {
    const hiddenHomeSong = createNode({ title: "Home Song", href: "/watch?v=home" });
    const visibleAlbumSong = createNode({ title: "Album Song", href: "/watch?v=album" });

    const hiddenRow = createRow({ 'a[href*="watch?v="]': hiddenHomeSong });
    hiddenRow.hidden = true;
    hiddenRow.getClientRects = () => [];

    const visibleRow = createRow({ 'a[href*="watch?v="]': visibleAlbumSong });

    const doc = {
      querySelectorAll(selector) {
        if (selector === "ytmusic-browse-response, ytmusic-player-page, ytmusic-search-page") {
          return [];
        }
        if (selector === "ytmusic-responsive-list-item-renderer") {
          return [hiddenRow, visibleRow];
        }
        return [];
      },
    };

    const result = extractSongsFromDocument(doc);
    assert.deepEqual(result, ["Album Song"]);
  }

  {
    const layoutlessButVisibleSong = createNode({
      title: "Layoutless Visible Song",
      href: "/watch?v=layoutless",
    });
    const row = createRow({ 'a[href*="watch?v="]': layoutlessButVisibleSong });
    row.getClientRects = () => [];

    const doc = {
      defaultView: {
        getComputedStyle() {
          return { display: "block", visibility: "visible" };
        },
      },
      querySelectorAll(selector) {
        if (selector === "ytmusic-browse-response, ytmusic-player-page, ytmusic-search-page") {
          return [];
        }
        if (selector === "ytmusic-responsive-list-item-renderer") {
          return [row];
        }
        return [];
      },
    };

    const result = extractSongsFromDocument(doc);
    assert.deepEqual(result, ["Layoutless Visible Song"]);
  }

  {
    const staleHomeSong = createNode({
      title: "Stale Home Song",
      href: "/watch?v=home123&list=HOME_LIST",
    });
    const currentPlaylistSong = createNode({
      title: "Current Playlist Song",
      href: "/watch?v=track123&list=TARGET_LIST",
    });

    const staleRow = createRow({ 'a[href*="watch?v="]': staleHomeSong });
    const currentRow = createRow({ 'a[href*="watch?v="]': currentPlaylistSong });

    const doc = {
      location: {
        href: "https://music.youtube.com/playlist?list=TARGET_LIST",
      },
      querySelectorAll(selector) {
        if (selector === "ytmusic-responsive-list-item-renderer") {
          return [staleRow, currentRow];
        }
        return [];
      },
    };

    const result = extractSongsFromDocument(doc);
    assert.deepEqual(result, ["Current Playlist Song"]);
  }

  {
    const onlyMismatchedListSong = createNode({
      title: "Mismatched But Should Fallback",
      href: "/watch?v=zzz&list=DIFFERENT_LIST",
    });
    const row = createRow({ 'a[href*="watch?v="]': onlyMismatchedListSong });

    const doc = {
      location: {
        href: "https://music.youtube.com/playlist?list=TARGET_LIST",
      },
      querySelectorAll(selector) {
        if (selector === "ytmusic-responsive-list-item-renderer") {
          return [row];
        }
        return [];
      },
    };

    const result = extractSongsFromDocument(doc);
    assert.deepEqual(result, ["Mismatched But Should Fallback"]);
  }

  {
    const song = createNode({
      title: "No Style Error Song",
      href: "/watch?v=nostyle&list=TARGET_LIST",
    });
    const row = createRow({ 'a[href*="watch?v="]': song });
    row.parentNode = { nodeType: 9 };

    const doc = {
      location: {
        href: "https://music.youtube.com/playlist?list=TARGET_LIST",
      },
      defaultView: {
        getComputedStyle(node) {
          if (!node || node.nodeType !== 1) {
            throw new Error("Window.getComputedStyle: Argument 1 does not implement interface Element.");
          }
          return { display: "block", visibility: "visible" };
        },
      },
      querySelectorAll(selector) {
        if (selector === "ytmusic-responsive-list-item-renderer") {
          return [row];
        }
        return [];
      },
    };

    const result = extractSongsFromDocument(doc);
    assert.deepEqual(result, ["No Style Error Song"]);
  }
}

try {
  runTests();
  console.log("All extractor tests passed.");
} catch (error) {
  console.error("Extractor tests failed.");
  console.error(error);
  process.exit(1);
}
