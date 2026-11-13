import assert from "node:assert/strict";
import { test } from "node:test";
import {
  MAX_MESSAGE_LENGTH,
  renderFiglet,
  toMessageContent,
} from "../bot/lib/figlet.js";

test("renderFiglet renders text as multi-line ASCII art", async () => {
  const { art, truncated } = await renderFiglet("hi");
  assert.equal(truncated, false);
  assert.ok(art.split("\n").length > 1);
  assert.ok(art.length > "hi".length);
});

test("renderFiglet supports an explicit font", async () => {
  const standard = await renderFiglet("reb", "Standard");
  const big = await renderFiglet("reb", "Big");
  assert.notEqual(standard.art, big.art);
  assert.ok(big.art.trim().length > 0);
});

test("renderFiglet output always fits in a single Discord message", async () => {
  const fitted = await renderFiglet("W".repeat(40));
  assert.equal(fitted.truncated, false);
  assert.ok(toMessageContent(fitted.art).length <= MAX_MESSAGE_LENGTH);

  const { art, truncated } = await renderFiglet("W".repeat(120));
  assert.equal(truncated, true);
  const content = toMessageContent(art);
  assert.ok(content.length <= MAX_MESSAGE_LENGTH);
  assert.ok(art.endsWith("..."));
});

test("renderFiglet never emits a literal triple backtick", async () => {
  const { art } = await renderFiglet("hi", "Digital");
  assert.ok(!art.includes("```"));
});
