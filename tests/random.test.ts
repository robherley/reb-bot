import assert from "node:assert/strict";
import { test } from "node:test";
import { InteractionType } from "discord-interactions";
import random from "../bot/commands/random.js";
import type { Interaction, InteractionOption } from "../bot/types.js";

function interaction(options: InteractionOption[] = []): Interaction {
  return {
    type: InteractionType.APPLICATION_COMMAND,
    data: { name: "random", options },
    token: "token",
    application_id: "application",
  };
}

function option(name: string, value: number): InteractionOption {
  return { name, value, type: 4 };
}

test("defaults to a number between 1 and 100", async () => {
  for (let i = 0; i < 100; i++) {
    const response = await random.handler(interaction());
    const value = Number(response.data?.content?.replace("🎲 ", ""));
    assert.ok(Number.isInteger(value), `not an integer: ${value}`);
    assert.ok(value >= 1 && value <= 100, `out of range: ${value}`);
  }
});

test("respects min and max bounds", async () => {
  for (let i = 0; i < 100; i++) {
    const response = await random.handler(
      interaction([option("min", 10), option("max", 12)]),
    );
    const value = Number(response.data?.content?.replace("🎲 ", ""));
    assert.ok(value >= 10 && value <= 12, `out of range: ${value}`);
  }
});

test("returns the only value when min equals max", async () => {
  const response = await random.handler(
    interaction([option("min", 5), option("max", 5)]),
  );
  assert.equal(response.data?.content, "🎲 5");
});

test("rejects an inverted range", async () => {
  const response = await random.handler(
    interaction([option("min", 10), option("max", 1)]),
  );
  assert.match(response.data?.content ?? "", /min/);
});
