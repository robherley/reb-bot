import { createHash, timingSafeEqual } from "node:crypto";
import { POST, type MessageContent } from "eve/channels";
import { discordContinuationToken, type DiscordChannelState } from "eve/channels/discord";
import { z } from "zod";

const snowflake = z.string().regex(/^\d{17,20}$/);
const attachmentSchema = z.object({
  url: z.url({ protocol: /^https$/ }),
  mediaType: z.string().min(1).max(255),
  filename: z.string().min(1).max(255),
});
const messageSchema = z.object({
  id: snowflake,
  channelId: snowflake,
  guildId: snowflake,
  userId: snowflake,
  applicationId: snowflake,
  isThread: z.boolean(),
  mentioned: z.boolean().default(true),
  replyToBotMessageId: snowflake.optional(),
  content: z.string().trim().max(4000).default(""),
  attachments: z.array(attachmentSchema).max(10).default([]),
}).refine((message) => Boolean(message.content) || message.attachments.length > 0, {
  message: "A message needs text or an attachment",
});

/**
 * Text plus one file part per attachment. The channel's `fetchFile` downloads
 * Discord's signed CDN URLs into the session sandbox, where images reach the
 * model as bytes and other files reach it as a readable path.
 */
export function messageContent(message: z.infer<typeof messageSchema>): MessageContent {
  if (message.attachments.length === 0) return message.content;
  return [
    ...(message.content ? [{ type: "text" as const, text: message.content }] : []),
    ...message.attachments.map((attachment) => ({
      type: "file" as const,
      data: new URL(attachment.url),
      mediaType: attachment.mediaType,
      filename: attachment.filename,
    })),
  ];
}

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
      const replyAddress = discordContinuationToken({ channelId: message.channelId, conversationId: message.replyToBotMessageId });
      if (await resolveSession(replyAddress)) anchor = message.replyToBotMessageId;
    }
    const address = discordContinuationToken({ channelId: message.channelId, conversationId: anchor });
    if (!message.mentioned && !(await resolveSession(address))) {
      // Don't start AI conversations in unrelated threads or on legacy slash-command replies.
      return new Response(null, { status: 204 });
    }
    const session = await from(address).send(messageContent(message), {
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
          message_id: message.id,
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
      },
    });

    return Response.json({ sessionId: session.sessionId }, { status: 202 });
  },
);
