const assert = require("node:assert/strict");
const fs = require("node:fs");

function runTests() {
  const manifest = JSON.parse(fs.readFileSync("./manifest.json", "utf8"));

  assert.equal(manifest.manifest_version, 3);
  assert.ok(manifest.browser_specific_settings);
  assert.ok(manifest.browser_specific_settings.gecko);
  assert.equal(typeof manifest.browser_specific_settings.gecko.id, "string");
  assert.notEqual(manifest.browser_specific_settings.gecko.id.trim(), "");
}

try {
  runTests();
  console.log("All manifest tests passed.");
} catch (error) {
  console.error("Manifest tests failed.");
  console.error(error);
  process.exit(1);
}
