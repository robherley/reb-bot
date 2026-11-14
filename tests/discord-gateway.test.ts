import assert from "node:assert/strict";
import { afterEach, beforeEach, test } from "node:test";
import { discordGatewayRoute } from "../agent/lib/discord-gateway.js";

const message = {
  id: "100000000000000001",
  channelId: "100000000000000002",
  guildId: "100000000000000003",
  userId: "100000000000000004",
  applicationId: "100000000000000005",
  isThread: false,
  mentioned: true,
  content: "hello",
};
const previousSecret = process.env.DISCORD_GATEWAY_SECRET;
const previousGuild = process.env.DISCORD_GUILD_ID;

beforeEach(() => {
  process.env.DISCORD_GATEWAY_SECRET = "test-secret";
  delete process.env.DISCORD_GUILD_ID;
});

afterEach(() => {
  for (const [key, value] of Object.entries({
    DISCORD_GATEWAY_SECRET: previousSecret,
    DISCORD_GUILD_ID: previousGuild,
  })) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
});

function request(
  body: Record<string, unknown> = message,
  secret = "test-secret",
) {
  return new Request("https://example.com/api/discord/gateway", {
    method: "POST",
    headers: { authorization: `Bearer ${secret}`, "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function harness(existing: string[] = []) {
  type SendOptions = { auth: { principalId: string }; state: Record<string, unknown> };
  const sent: { address: string; content: unknown; options: SendOptions }[] = [];
  const args = {
    resolveSession: async (address: string) => existing.includes(address) ? {} : null,
    from: (address: string) => ({
      send: async (content: unknown, options: SendOptions) => {
        sent.push({ address, content, options });
        return { sessionId: "eve-session" };
      },
    }),
  } as unknown as Parameters<typeof discordGatewayRoute.handler>[1];
  return { sent, args };
}

test("rejects invalid gateway credentials before dispatch", async () => {
  const { args, sent } = harness();
  const response = await discordGatewayRoute.handler(request(message, "wrong"), args);
  assert.equal(response.status, 401);
  assert.equal(sent.length, 0);
});

test("dispatches using Eve's new continuation and delivery APIs", async () => {
  const { args, sent } = harness();
  const response = await discordGatewayRoute.handler(request(), args);
  assert.equal(response.status, 202);
  assert.deepEqual(await response.json(), { sessionId: "eve-session" });
  assert.equal(sent[0]?.address, `${message.channelId}:${message.id}`);
  assert.equal(sent[0]?.content, "hello");
  assert.equal(sent[0]?.options.auth.principalId, `discord:${message.guildId}:${message.userId}`);
  assert.deepEqual(sent[0]?.options.state, {
    audience: "unknown",
    channelId: message.channelId,
    conversationId: message.id,
    guildId: message.guildId,
    applicationId: message.applicationId,
  });
});

test("continues an existing session when replying to a bot message", async () => {
  const replyToBotMessageId = "100000000000000006";
  const address = `${message.channelId}:${replyToBotMessageId}`;
  const { args, sent } = harness([address]);
  const response = await discordGatewayRoute.handler(request({ ...message, replyToBotMessageId }), args);
  assert.equal(response.status, 202);
  assert.equal(sent[0]?.address, address);
});

test("ignores unmentioned messages without an existing session", async () => {
  const { args, sent } = harness();
  const response = await discordGatewayRoute.handler(request({ ...message, mentioned: false, isThread: true }), args);
  assert.equal(response.status, 204);
  assert.equal(sent.length, 0);
});

test("rejects messages from a disallowed guild", async () => {
  process.env.DISCORD_GUILD_ID = "100000000000000099";
  const { args, sent } = harness();
  const response = await discordGatewayRoute.handler(request(), args);
  assert.equal(response.status, 403);
  assert.equal(sent.length, 0);
});

const attachment = {
  url: "https://cdn.discordapp.com/attachments/100000000000000002/100000000000000007/photo.png?ex=1&is=2&hm=3",
  mediaType: "image/png",
  filename: "photo.png",
};

test("forwards image attachments as file parts next to the text", async () => {
  const { args, sent } = harness();
  const response = await discordGatewayRoute.handler(request({ ...message, attachments: [attachment] }), args);
  assert.equal(response.status, 202);
  const content = sent[0]?.content as { type: string; text?: string; data?: URL; mediaType?: string; filename?: string }[];
  assert.equal(content[0]?.type, "text");
  assert.equal(content[0]?.text, "hello");
  assert.equal(content[1]?.type, "file");
  assert.equal(content[1]?.mediaType, "image/png");
  assert.equal(content[1]?.filename, "photo.png");
  assert.equal(content[1]?.data?.hostname, "cdn.discordapp.com");
});

test("dispatches attachment-only messages without inventing text", async () => {
  const { args, sent } = harness();
  const response = await discordGatewayRoute.handler(request({ ...message, content: "", attachments: [attachment] }), args);
  assert.equal(response.status, 202);
  const content = sent[0]?.content as { type: string }[];
  assert.deepEqual(content.map((part) => part.type), ["file"]);
});

test("forwards the replied-to message's text and attachments", async () => {
  const { args, sent } = harness();
  const replyTo = {
    id: "100000000000000009",
    authorId: "100000000000000010",
    authorIsBot: false,
    content: "check out this deal https://store.ui.com/us/en/tags/black-friday",
    attachments: [attachment],
  };
  const response = await discordGatewayRoute.handler(
    request({ ...message, content: "is this a sweet deal?", replyTo }),
    args,
  );
  assert.equal(response.status, 202);
  const content = sent[0]?.content as { type: string; text?: string; filename?: string; data?: URL }[];
  assert.deepEqual(content.map((part) => part.type), ["text", "file", "text"]);
  assert.match(content[0]?.text ?? "", /check out this deal/);
  assert.match(content[0]?.text ?? "", /100000000000000010/);
  assert.equal(content[1]?.filename, "photo.png");
  assert.equal(content[1]?.data?.hostname, "cdn.discordapp.com");
  assert.equal(content[2]?.text, "is this a sweet deal?");
});

test("forwards reply context for a bot-authored message and keeps its session", async () => {
  const replyTo = {
    id: "100000000000000006",
    authorId: message.applicationId,
    authorIsBot: true,
    content: "here are the deals",
    attachments: [],
  };
  const { args, sent } = harness([`${message.channelId}:${replyTo.id}`]);
  const response = await discordGatewayRoute.handler(
    request({ ...message, content: "and this?", replyToBotMessageId: replyTo.id, replyTo }),
    args,
  );
  assert.equal(response.status, 202);
  assert.equal(sent[0]?.address, `${message.channelId}:${replyTo.id}`);
  const content = sent[0]?.content as { type: string; text?: string }[];
  assert.match(content[0]?.text ?? "", /the bot/);
  assert.equal(content[1]?.text, "and this?");
});

test("rejects messages with neither text nor attachments", async () => {
  const { args, sent } = harness();
  const response = await discordGatewayRoute.handler(request({ ...message, content: "" }), args);
  assert.equal(response.status, 400);
  assert.equal(sent.length, 0);
});
