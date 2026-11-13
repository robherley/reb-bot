import assert from "node:assert/strict";
import { test } from "node:test";
import type { SessionAuthContext } from "eve/context";
import type { DiscordEventContext } from "eve/channels/discord";
import { bindCodingThread, startCodingThread } from "../agent/lib/coding-thread.js";
import { config } from "../config.js";

test("coding threads post the plan immediately, reuse threads, and retain session routing", async (t) => {
  const oldToken = process.env.DISCORD_BOT_TOKEN;
  const oldGuild = process.env.DISCORD_GUILD_ID;
  const oldDevelopers = config.developers;
  process.env.DISCORD_BOT_TOKEN = "test-token";
  delete process.env.DISCORD_GUILD_ID;
  config.developers = [{ github: "example", discord: "42" }];
  t.after(() => {
    config.developers = oldDevelopers;
    for (const [name, value] of Object.entries({ DISCORD_BOT_TOKEN: oldToken, DISCORD_GUILD_ID: oldGuild })) {
      if (value === undefined) delete process.env[name];
      else process.env[name] = value;
    }
  });
  const auth: SessionAuthContext = {
    authenticator: "discord-interaction", principalType: "user", principalId: "discord:1:42",
    attributes: { guild_id: "1", user_id: "42", channel_id: "10", message_id: "20" },
  };
  const plan = { title: "Improve reb", plan: "I'll inspect the command, fix it, and run the tests." };
  const calls: { path: string; method: string; body: Record<string, unknown> }[] = [];
  let created = false;
  const request: typeof fetch = async (url, options) => {
    const path = new URL(String(url)).pathname.replace("/api/v10", "");
    const method = options?.method ?? "GET";
    const body = options?.body ? JSON.parse(String(options.body)) : {};
    calls.push({ path, method, body });
    if (path === "/channels/10") return Response.json({ id: "10", type: 0, guild_id: "1" });
    if (path === "/channels/30") return Response.json({ id: "30", type: 11, guild_id: "1" });
    if (path === "/channels/10/messages/20") return Response.json(created ? { thread: { id: "30" } } : {});
    if (path.endsWith("/threads")) {
      created = true;
      return Response.json({ id: "30" });
    }
    if (path.endsWith("/thread-members/42")) return new Response(null, { status: 204 });
    if (path === "/channels/30/messages") return Response.json({ id: "40" });
    throw new Error(`Unexpected request ${method} ${path}`);
  };
  const result = await startCodingThread(auth, plan, request);
  assert.deepEqual(result, { threadId: "30", conversationId: "30", messageId: "40", sourceChannelId: "10" });
  assert.equal(calls.at(-1)?.body.content, plan.plan);
  assert.deepEqual(calls.at(-1)?.body.allowed_mentions, { parse: [] });
  await startCodingThread(auth, plan, request);
  assert.equal(calls.filter((call) => call.path.endsWith("/threads")).length, 1);
  await startCodingThread({ ...auth, attributes: { ...auth.attributes, channel_id: "30" } }, plan, request);
  assert.equal(calls.filter((call) => call.path.endsWith("/threads")).length, 1);

  const aliases: string[] = [];
  const channel = {
    state: { channelId: "10", conversationId: "20" },
    continuation: { alias: (address: string) => aliases.push(address) },
  } as unknown as DiscordEventContext;
  assert.equal(bindCodingThread(channel, result), true);
  assert.deepEqual(aliases, ["30:30", "30:40"]);
  assert.equal(channel.state.channelId, "30");
  assert.equal(channel.state.conversationId, "30");
  assert.equal(bindCodingThread(channel, { ...result, sourceChannelId: "99", threadId: "98" }), false);

  created = false;
  let fallbackPosts = 0;
  const noThreads: typeof fetch = async (url, options) => {
    const path = new URL(String(url)).pathname;
    if (path.endsWith("/threads")) return new Response(null, { status: 403 });
    if (path.endsWith("/channels/10/messages") && options?.method === "POST") {
      const body = JSON.parse(String(options.body));
      assert.deepEqual(body.message_reference, { message_id: "20", fail_if_not_exists: false });
      assert.equal(body.content, plan.plan);
      fallbackPosts++;
      return Response.json({ id: "50" });
    }
    return request(url, options);
  };
  const fallback = await startCodingThread(auth, plan, noThreads);
  assert.equal(fallback.threadId, null);
  assert.equal(fallbackPosts, 1);
  channel.state.channelId = "10";
  channel.state.conversationId = "20";
  aliases.length = 0;
  assert.equal(bindCodingThread(channel, fallback), true);
  assert.equal(channel.state.channelId, "10");
  assert.equal(channel.state.conversationId, "20");
  assert.deepEqual(aliases, ["10:20", "10:50"]);
  assert.ok(!aliases.includes("10:10"), "fallback must not merge all channel conversations");

  // A thread exists but the bot cannot send messages there.
  created = true;
  const noThreadMessages: typeof fetch = async (url, options) => {
    if (String(url).endsWith("/channels/30/messages")) return new Response(null, { status: 403 });
    return noThreads(url, options);
  };
  assert.equal((await startCodingThread(auth, plan, noThreadMessages)).threadId, null);
  assert.equal(fallbackPosts, 2);

  const neverFetch: typeof fetch = async () => { throw new Error("must not fetch"); };
  await assert.rejects(startCodingThread(null, plan, neverFetch), /authorized Discord developer/);
  await assert.rejects(startCodingThread({ ...auth, principalId: "discord:1:99" }, plan, neverFetch), /authorized Discord developer/);
  await assert.rejects(startCodingThread(auth, plan, async () => new Response(null, { status: 403 })), /403/);
});
