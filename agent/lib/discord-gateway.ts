import { createHash, timingSafeEqual } from "node:crypto";
import { POST } from "eve/channels";
import { discordContinuationToken, type DiscordChannelState } from "eve/channels/discord";
import { z } from "zod";

const snowflake = z.string().regex(/^\d{17,20}$/);
const messageSchema = z.object({
  id: snowflake,
  channelId: snowflake,
  guildId: snowflake,
  userId: snowflake,
  applicationId: snowflake,
  isThread: z.boolean(),
  mentioned: z.boolean().default(true),
  replyToBotMessageId: snowflake.optional(),
  content: z.string().trim().min(1).max(4000),
});

function digest(value: string) {
  return createHash("sha256").update(value).digest();
}

export const discordGatewayRoute = POST<DiscordChannelState>(
  "/api/discord/gateway",
  async (request, { from, resolveSession }) => {
    const secret = process.env.DISCORD_GATEWAY_SECRET;
    if (!secret) return new Response("Gateway not configured", { status: 503 });

    if (!timingSafeEqual(
      digest(request.headers.get("authorization") ?? ""),
      digest(`Bearer ${secret}`),
    )) return new Response("Unauthorized", { status: 401 });

    const parsed = messageSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return new Response("Invalid message", { status: 400 });
    const message = parsed.data;
    const allowedGuild = process.env.DISCORD_GUILD_ID;
    if (allowedGuild && message.guildId !== allowedGuild) {
      return new Response("Guild not allowed", { status: 403 });
    }

    // Reply aliases are persisted by the Discord output handler, not daemon memory.
    let anchor = message.isThread ? message.channelId : message.id;
    if (message.replyToBotMessageId) {
      const replyAddress = discordContinuationToken(message.channelId, message.replyToBotMessageId);
      if (await resolveSession(replyAddress)) anchor = message.replyToBotMessageId;
    }
    const address = discordContinuationToken(message.channelId, anchor);
    if (!message.mentioned && !(await resolveSession(address))) {
      // Don't start AI conversations in unrelated threads or on legacy slash-command replies.
      return new Response(null, { status: 204 });
    }
    const session = await from(address).send(message.content, {
      idempotencyKey: `discord:message:${message.id}`,
      auth: {
        // Match defaultDiscordAuth so native approval buttons recognize the requester.
        principalId: `discord:${message.guildId}:${message.userId}`,
        principalType: "user",
        issuer: `discord:${message.guildId}`,
        authenticator: "discord-interaction",
        attributes: {
          channel_id: message.channelId,
          guild_id: message.guildId,
          user_id: message.userId,
        },
      },
      context: [
        `<discord_context>\n${JSON.stringify({
          user_id: message.userId,
          application_id: message.applicationId,
          channel_id: message.channelId,
          guild_id: message.guildId,
          message_id: message.id,
        })}\n</discord_context>`,
      ],
      state: {
        // A guild channel may be private; the Gateway payload doesn't prove visibility.
        audience: "unknown",
        channelId: message.channelId,
        conversationId: anchor,
        guildId: message.guildId,
        applicationId: message.applicationId,
        interactionToken: null,
        initialResponseSent: true,
        hasMessageAnchor: true,
      },
    });

    return Response.json({ sessionId: session.id }, { status: 202 });
  },
);
