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
const replySchema = z.object({
  id: snowflake,
  authorId: snowflake,
  authorIsBot: z.boolean().default(false),
  content: z.string().trim().max(4000).default(""),
  attachments: z.array(attachmentSchema).max(10).default([]),
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
  /** Replied-to message text and attachments, so replies keep their context. */
  replyTo: replySchema.optional(),
  content: z.string().trim().max(4000).default(""),
  attachments: z.array(attachmentSchema).max(10).default([]),
}).refine((message) => Boolean(message.content) || message.attachments.length > 0, {
  message: "A message needs text or an attachment",
});

/**
 * Text plus one file part per attachment. The channel's `fetchFile` downloads
 * Discord's signed CDN URLs into the session sandbox, where images reach the
 * model as bytes and other files reach it as a readable path. A reply's own
 * text and attachments are sent first so the model can see what was answered.
 */
export function messageContent(message: z.infer<typeof messageSchema>): MessageContent {
  const parts = [
    ...(message.replyTo ? [{ type: "text" as const, text: replyDescription(message.replyTo) }] : []),
    ...fileParts(message.replyTo?.attachments ?? []),
    ...(message.content ? [{ type: "text" as const, text: message.content }] : []),
    ...fileParts(message.attachments),
  ];
  if (parts.length === 0) return message.content;
  if (parts.length === 1 && parts[0]?.type === "text") return parts[0].text;
  return parts;
}

function replyDescription(reply: z.infer<typeof replySchema>): string {
  const author = reply.authorIsBot ? "the bot" : `<@${reply.authorId}>`;
  const body = reply.content || "(no text)";
  const files = reply.attachments.length > 0
    ? `\nThe replied-to message also has ${reply.attachments.length} attachment(s), listed after this text.`
    : "";
  return `Replying to a message from ${author} (message ${reply.id}):\n${body}${files}`;
}

function fileParts(attachments: z.infer<typeof attachmentSchema>[]) {
  return attachments.map((attachment) => ({
    type: "file" as const,
    data: new URL(attachment.url),
    mediaType: attachment.mediaType,
    filename: attachment.filename,
  }));
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
