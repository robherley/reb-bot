import assert from "node:assert/strict";
import { test } from "node:test";
import shopsavvy from "../agent/connections/shopsavvy.js";

test("ShopSavvy connects to the public MCP endpoint without credentials", () => {
  assert.equal(shopsavvy.url, "https://api.shopsavvy.com/mcp");
  assert.equal(shopsavvy.auth, undefined);
  assert.equal(shopsavvy.headers, undefined);
});

test("ShopSavvy hides the tools that need a ShopSavvy API key", () => {
  const blocked = shopsavvy.tools?.block ?? [];
  for (const tool of ["product_schedule", "product_unschedule", "scheduled_products_list"]) {
    assert.ok(blocked.includes(tool), `${tool} should be blocked`);
  }
  assert.equal(shopsavvy.tools?.allow, undefined);
});
