const assert = require("node:assert/strict");
const { isExtractableUrl } = require("./popupState");

function runTests() {
  assert.equal(isExtractableUrl("https://music.youtube.com/"), false);
  assert.equal(isExtractableUrl("https://music.youtube.com/browse/MPREb_abc"), true);
  assert.equal(isExtractableUrl("https://music.youtube.com/playlist?list=OLAK5uy_abc"), true);
  assert.equal(isExtractableUrl("https://music.youtube.com/watch?v=abc&list=OLAK5uy_def"), true);
  assert.equal(isExtractableUrl("https://music.youtube.com/watch?v=abc"), false);
  assert.equal(isExtractableUrl("https://www.youtube.com/watch?v=abc&list=def"), false);
  assert.equal(isExtractableUrl("not-a-url"), false);
}

try {
  runTests();
  console.log("All popup state tests passed.");
} catch (error) {
  console.error("Popup state tests failed.");
  console.error(error);
  process.exit(1);
}
