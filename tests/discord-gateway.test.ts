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

function request(body: typeof message & { replyToBotMessageId?: string } = message, secret = "test-secret") {

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
