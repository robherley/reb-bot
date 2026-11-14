import assert from "node:assert/strict";
import { test } from "node:test";
import type { Message } from "discord.js";
import {
  messageAttachments,
  messagePayload,
  resolveReply,
  type GatewayMessage,
  type ReplyContext,
} from "../gateway/messages.ts";

const BOT_ID = "100000000000000005";
const cdnUrl = (name: string) => `https://cdn.discordapp.com/attachments/1/2/${name}?ex=1&is=2&hm=3`;

function gatewayMessage(overrides: Partial<GatewayMessage> = {}): GatewayMessage {
  return {
    id: "100000000000000001",
    channelId: "100000000000000002",
    guildId: "100000000000000003",
    author: { id: "100000000000000004", bot: false },
    channel: { isThread: () => false },
    content: `<@${BOT_ID}> what is this`,
    ...overrides,
  };
}

test("carries Discord CDN attachments in the gateway payload", () => {
  const payload = messagePayload(
    gatewayMessage({
      attachments: {
        values: () => [{ url: cdnUrl("photo.png"), name: "photo.png", contentType: "image/png" }],
      },
    }),
    BOT_ID,
  );
  assert.equal(payload?.content, "what is this");
  assert.deepEqual(payload?.attachments, [
    { url: cdnUrl("photo.png"), mediaType: "image/png", filename: "photo.png" },
  ]);
});

test("keeps attachment-only mentions instead of dropping them as empty", () => {
  const payload = messagePayload(
    gatewayMessage({
      content: `<@${BOT_ID}>`,
      attachments: {
        values: () => [{ url: cdnUrl("photo.png"), name: "photo.png", contentType: "image/png" }],
      },
    }),
    BOT_ID,
  );
  assert.equal(payload?.content, "");
  assert.equal(payload?.attachments.length, 1);
});

function replyMessage(reference: {
  id: string;
  channelId: string;
  author: { id: string };
  content: string;
  attachments?: { values(): Iterable<{ url: string; name: string; contentType: string | null }> };
}) {
  return {
    channelId: "100000000000000002",
    reference: { messageId: reference.id },
    fetchReference: async () => reference,
  } as unknown as Message;
}

test("resolves the replied-to message's text and attachments", async () => {
  const replyTo = await resolveReply(
    replyMessage({
      id: "100000000000000009",
      channelId: "100000000000000002",
      author: { id: "100000000000000004" },
      content: "  check out this deal  ",
      attachments: {
        values: () => [{ url: cdnUrl("deal.png"), name: "deal.png", contentType: "image/png" }],
      },
    }),
    BOT_ID,
  );
  assert.deepEqual(replyTo, {
    id: "100000000000000009",
    authorId: "100000000000000004",
    authorIsBot: false,
    content: "check out this deal",
    attachments: [{ url: cdnUrl("deal.png"), mediaType: "image/png", filename: "deal.png" }],
  });
});

test("resolves no reply context without a message reference", async () => {
  assert.equal(await resolveReply({ channelId: "100000000000000002" } as unknown as Message, BOT_ID), undefined);
});

test("resolves no reply context when the reference cannot be fetched", async () => {
  const message = {
    channelId: "100000000000000002",
    reference: { messageId: "100000000000000009" },
    fetchReference: async () => {
      throw new Error("Unknown Message");
    },
  } as unknown as Message;
  assert.equal(await resolveReply(message, BOT_ID), undefined);
});

test("resolves no reply context for a reference from another channel", async () => {
  const replyTo = await resolveReply(
    replyMessage({
      id: "100000000000000009",
      channelId: "100000000000000007",
      author: { id: "100000000000000004" },
      content: "elsewhere",
    }),
    BOT_ID,
  );
  assert.equal(replyTo, undefined);
});

test("forwards the reply context next to the message", () => {
  const replyTo = replyContext();
  const payload = messagePayload(gatewayMessage({ content: `<@${BOT_ID}> is this a sweet deal?` }), BOT_ID, replyTo);
  assert.deepEqual(payload?.replyTo, replyTo);
  assert.equal(payload?.content, "is this a sweet deal?");
  assert.equal(payload?.replyToBotMessageId, undefined);
});

test("keeps continuing the session when the reply context is the bot's own", () => {
  const replyTo = replyContext({ authorIsBot: true });
  const payload = messagePayload(gatewayMessage({ content: "and this?" }), BOT_ID, replyTo);
  assert.equal(payload?.replyToBotMessageId, replyTo.id);
  assert.equal(payload?.replyTo?.authorIsBot, true);
});

function replyContext(overrides: Partial<ReplyContext> = {}): ReplyContext {
  return {
    id: "100000000000000009",
    authorId: "100000000000000004",
    authorIsBot: false,
    content: "check out this deal https://store.ui.com/us/en/tags/black-friday",
    attachments: [{ url: cdnUrl("deal.png"), mediaType: "image/png", filename: "deal.png" }],
    ...overrides,
  };
}

test("drops attachments the agent's Discord channel cannot fetch", () => {
  const attachments = messageAttachments({
    attachments: {
      values: () => [
        { url: "https://example.com/photo.png", name: "photo.png", contentType: "image/png" },
        { url: "http://cdn.discordapp.com/attachments/1/2/photo.png", name: "photo.png", contentType: "image/png" },
        { url: "not a url", name: "photo.png", contentType: "image/png" },
        { url: cdnUrl("kept.png"), name: "kept.png", contentType: null },
      ],
    },
  });
  assert.deepEqual(attachments, [
    { url: cdnUrl("kept.png"), mediaType: "application/octet-stream", filename: "kept.png" },
  ]);
});
