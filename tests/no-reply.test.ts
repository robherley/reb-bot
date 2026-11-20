import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import noReply from "../agent/tools/no_reply.js";

test("the agent can end a turn without posting a reply", () => {
  assert.equal(noReply.endsTurn, true);
  assert.equal(noReply.availableInSubagents, false);
});

test("the instructions tell the agent to stay quiet instead of posting a status", () => {
  return readFile(new URL("../agent/instructions.md", import.meta.url), "utf8").then((instructions) => {
    assert.match(instructions, /`no_reply`/);
    assert.match(instructions, /never send a status, summary, or "no change" note/);
  });
});
