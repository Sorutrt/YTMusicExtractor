const assert = require("node:assert/strict");
const { extractSongsFromDocument } = require("./extractor");

function createNode({ text = "", title = "", href = "", children = {} } = {}) {
  return {
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
    querySelector(selector) {
      return childBySelector[selector] || null;
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
}

try {
  runTests();
  console.log("All extractor tests passed.");
} catch (error) {
  console.error("Extractor tests failed.");
  console.error(error);
  process.exit(1);
}
