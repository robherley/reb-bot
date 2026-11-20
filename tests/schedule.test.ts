import assert from "node:assert/strict";
import { test } from "node:test";
import { scheduleDestination, scheduledTaskMessage } from "../agent/lib/schedule.js";

test("schedules capture the caller's channel and server", () => {
  assert.deepEqual(
    scheduleDestination({ channel_id: "100000000000000002", guild_id: "100000000000000003" }),
    { channelId: "100000000000000002", guildId: "100000000000000003" },
  );
});

test("schedules keep working in a DM, where there is no server", () => {
  assert.deepEqual(
    scheduleDestination({ channel_id: "100000000000000002" }),
    { channelId: "100000000000000002", guildId: "" },
  );
});

test("schedules refuse callers without a Discord channel", () => {
  assert.throws(() => scheduleDestination(undefined), /only be created from a Discord channel/);
  assert.throws(() => scheduleDestination({}), /only be created from a Discord channel/);
});

test("schedules refuse a channel id the model could have invented", () => {
  assert.throws(() => scheduleDestination({ channel_id: "../etc/passwd" }), /Discord channel/);
  assert.throws(() => scheduleDestination({ channel_id: 12345 }), /Discord channel/);
});

test("scheduled messages name the schedule and keep the task verbatim", () => {
  assert.equal(
    scheduledTaskMessage(
      { task: "Post the open PRs.", channelId: "100000000000000002", guildId: "" },
      "pr-digest",
    ),
    'run scheduled task "pr-digest": Post the open PRs.',
  );
});
