import { createHash } from "node:crypto";
import type { SessionAuthContext } from "eve/context";
import { discordContinuationToken, type DiscordChannelState, type DiscordEventContext } from "eve/channels/discord";
import { z } from "zod";
import { canImproveSelf } from "./github.js";

export type CodingThreadState = DiscordChannelState & { codingReplyMessageId?: string };

export const codingThreadResult = z.object({
  threadId: z.string().regex(/^\d+$/).nullable(),
  conversationId: z.string().regex(/^\d+$/),
  messageId: z.string().regex(/^\d+$/),
  sourceChannelId: z.string().regex(/^\d+$/),
});

export function bindCodingThread(channel: DiscordEventContext, output: unknown): boolean {
  const parsed = codingThreadResult.safeParse(output);
  if (!parsed.success) return false;
  const { threadId, conversationId, messageId, sourceChannelId } = parsed.data;
  if (sourceChannelId !== channel.state.channelId && threadId !== channel.state.channelId) return false;
  const channelId = threadId ?? sourceChannelId;
  channel.state.channelId = channelId;
  channel.state.conversationId = conversationId;
  (channel.state as CodingThreadState).codingReplyMessageId = threadId ? undefined : conversationId;
  channel.continuation?.alias(discordContinuationToken({ channelId, conversationId }));
  channel.continuation?.alias(discordContinuationToken({ channelId, conversationId: messageId }));
  return true;
}

export async function startCodingThread(
  auth: SessionAuthContext | null,
  input: { title: string; plan: string },
  request: typeof fetch = fetch,
) {
  if (!canImproveSelf(auth) || auth?.authenticator !== "discord-interaction") {
    throw new Error("Coding threads require an authorized Discord developer.");
  }
  const channelId = auth.attributes.channel_id;
  const userId = auth.attributes.user_id;
  const sourceMessageId = auth.attributes.message_id;
  if (typeof channelId !== "string" || !/^\d+$/.test(channelId)) {
    throw new Error("Missing Discord channel.");
  }
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) throw new Error("Discord bot access is not configured.");
  async function api(path: string, method = "GET", body?: unknown): Promise<Record<string, unknown>> {
    const response = await request(`https://discord.com/api/v10${path}`, {
      method,
      headers: { authorization: `Bot ${token}`, "content-type": "application/json" },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) throw new Error(`Discord coding thread request failed (${response.status}).`);
    return response.status === 204 ? {} : await response.json() as Record<string, unknown>;
  }
  const channel = await api(`/channels/${channelId}`);
  if (channel.guild_id !== auth.attributes.guild_id) throw new Error("Discord guild mismatch.");
  let threadId: string | null = channelId;
  if (![10, 11, 12].includes(Number(channel.type))) {
    if (typeof sourceMessageId !== "string" || !/^\d+$/.test(sourceMessageId)) {
      throw new Error("Start coding from a Discord message or an existing thread.");
    }
    const path = `/channels/${channelId}/messages/${sourceMessageId}`;
    const existingThread = async () => {
      const message = await api(path);
      const thread = message.thread as { id?: unknown } | undefined;
      return typeof thread?.id === "string" ? thread.id : undefined;
    };
    try {
      let id = await existingThread();
      if (!id) {
        try {
          const created = await api(`${path}/threads`, "POST", {
            name: input.title, auto_archive_duration: 1440,
          });
          if (typeof created.id !== "string") throw new Error("Discord returned no thread ID.");
          id = created.id;
        } catch (error) {
          // A retried/concurrent tool call may have already created this thread.
          id = await existingThread();
          if (!id) throw error;
        }
      }
      threadId = id;
      // Adding the requester is helpful but must not block posting the plan.
      await api(`/channels/${threadId}/thread-members/${userId}`, "PUT").catch(() => {});
    } catch {
      threadId = null;
    }
  }
  const message = {
    content: input.plan,
    allowed_mentions: { parse: [] },
    nonce: createHash("sha256").update(`${sourceMessageId}:${input.plan}`).digest("hex").slice(0, 24),
    enforce_nonce: true,
  };
  const reply = () => api(`/channels/${channelId}/messages`, "POST", {
    ...message,
    ...(typeof sourceMessageId === "string" ? {
      message_reference: { message_id: sourceMessageId, fail_if_not_exists: false },
    } : {}),
  });
  let posted;
  if (threadId) {
    try {
      posted = await api(`/channels/${threadId}/messages`, "POST", message);
    } catch (error) {
      if (threadId === channelId) throw error;
      threadId = null;
      posted = await reply();
    }
  } else {
    posted = await reply();
  }
  return codingThreadResult.parse({
    threadId,
    conversationId: threadId ?? sourceMessageId,
    messageId: posted.id,
    sourceChannelId: channelId,
  });
}
