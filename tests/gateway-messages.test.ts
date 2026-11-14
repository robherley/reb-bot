import assert from "node:assert/strict";
import { test } from "node:test";
import { messageAttachments, messagePayload, type GatewayMessage } from "../gateway/messages.ts";

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
