import { Client, Events, GatewayIntentBits, type Message } from "discord.js";
import type { GatewayConfig } from "./config.ts";
import { forwardMessage } from "./forward.ts";
import { isHumanMessage, messagePayload, resolveBotReply } from "./messages.ts";

const SHUTDOWN_TIMEOUT_MS = 25_000;

export async function startGateway(config: GatewayConfig): Promise<void> {
  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
  });
  const pending = new Set<Promise<void>>();
  const shutdown = new AbortController();
  let stopping = false;

  async function handleMessage(message: Message, botId: string): Promise<void> {
    const replyId = await resolveBotReply(message, botId);
    const payload = messagePayload(message, botId, replyId);
    if (!payload) return;

    await forwardMessage(payload, {
      url: config.url,
      secret: config.secret,
      bypassSecret: config.bypassSecret,
      signal: shutdown.signal,
    });
  }

  function onMessage(message: Message): void {
    if (stopping || !client.user || !isHumanMessage(message)) return;
    if (config.guildId && message.guildId !== config.guildId) return;

    const task = handleMessage(message, client.user.id)
      .catch((error: unknown) => {
        const detail = error instanceof Error ? error.message : "unknown error";
        console.error(`Failed forwarding Discord message ${message.id}: ${detail}`);
      })
      .finally(() => pending.delete(task));

    pending.add(task);
  }

  async function stop(): Promise<void> {
    if (stopping) return;
    stopping = true;
    console.log(`Stopping Discord Gateway; draining ${pending.size} deliveries`);

    const deadline = setTimeout(() => shutdown.abort(), SHUTDOWN_TIMEOUT_MS);
    try {
      await client.destroy();
      await Promise.allSettled(pending);
    } finally {
      clearTimeout(deadline);
    }
  }

  client.once(Events.ClientReady, (ready) => {
    console.log(`Discord Gateway connected as ${ready.user.tag}`);
  });
  client.on(Events.Error, () => console.error("Discord client error"));
  client.on(Events.ShardError, () => console.error("Discord Gateway error"));
  client.on(Events.MessageCreate, onMessage);

  process.once("SIGTERM", () => void stop());
  process.once("SIGINT", () => void stop());
  await client.login(config.token);
}
