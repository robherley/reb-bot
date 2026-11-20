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

test("ShopSavvy guidance tells the model to verify live prices before quoting", () => {
  const description = shopsavvy.description ?? "";
  assert.match(description, /cached snapshot/i);
  assert.match(description, /verify the live price/i);
  assert.match(description, /stale/i);
});

test("standing ShopSavvy instructions call out staleness and mismatched links", async () => {
  const { default: instructions } = await import("../agent/instructions/shopsavvy.js");
  const content = JSON.stringify(instructions);
  assert.match(content, /last-checked date/i);
  assert.match(content, /cached snapshot/i);
  assert.match(content, /refurbished/i);
});
