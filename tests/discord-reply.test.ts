import assert from "node:assert/strict";
import { test } from "node:test";
import type { SessionAuthContext } from "eve/context";
import { replyBody, replyToMessageId, type ReplyState } from "../agent/lib/reply.js";

const state: ReplyState = {
  audience: "unknown",
  applicationId: "100000000000000005",
  channelId: "100000000000000002",
  conversationId: "100000000000000001",
  guildId: "100000000000000003",
};

function auth(attributes: SessionAuthContext["attributes"]): SessionAuthContext {
  return {
    attributes,
    authenticator: "discord-interaction",
    issuer: "discord:100000000000000003",
    principalId: "discord:100000000000000003:100000000000000004",
    principalType: "user",
  };
}

test("replies reference the message that triggered the turn", () => {
  assert.equal(
    replyToMessageId(state, auth({
      channel_id: "100000000000000002",
      guild_id: "100000000000000003",
      message_id: "100000000000000009",
      user_id: "100000000000000004",
    })),
    "100000000000000009",
  );
});

test("replies skip the reference for interaction follow-ups", () => {
  assert.equal(replyToMessageId(state, null), undefined);
});

test("replies skip the reference when the trigger came from another channel", () => {
  assert.equal(
    replyToMessageId(state, auth({ channel_id: "100000000000000007", message_id: "100000000000000009" })),
    undefined,
  );
});

test("replies skip the reference when auth carries no usable message id", () => {
  assert.equal(replyToMessageId(state, auth({ channel_id: "100000000000000002" })), undefined);
  assert.equal(
    replyToMessageId(state, auth({ channel_id: "100000000000000002", message_id: "not-a-snowflake" })),
    undefined,
  );
});

test("coding threads keep replying to their plan message", () => {
  assert.equal(
    replyToMessageId(
      { ...state, channelId: "100000000000000030", codingReplyMessageId: "100000000000000031" },
      auth({ channel_id: "100000000000000030", message_id: "100000000000000032" }),
    ),
    "100000000000000031",
  );
  assert.equal(
    replyToMessageId({ ...state, codingReplyMessageId: "100000000000000031" }, null),
    "100000000000000031",
  );
});

test("reply bodies reference without pinging", () => {
  assert.equal(replyBody("hello", undefined), "hello");
  assert.deepEqual(replyBody("hello", "100000000000000009"), {
    content: "hello",
    allowed_mentions: { parse: [], replied_user: false },
    message_reference: { message_id: "100000000000000009", fail_if_not_exists: false },
  });
});
