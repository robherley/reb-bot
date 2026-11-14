import type { Message } from "discord.js";

interface GatewayAttachmentSource {
  url: string;
  name: string;
  contentType: string | null;
}

export interface GatewayMessage {
  id: string;
  channelId: string;
  guildId: string | null;
  webhookId?: string | null;
  author: { id: string; bot: boolean };
  channel: { isThread(): boolean };
  content: string;
  /** discord.js collections iterate entries, so read the values instead. */
  attachments?: { values(): Iterable<GatewayAttachmentSource> };
}

export interface GatewayAttachment {
  url: string;
  mediaType: string;
  filename: string;
}

/**
 * The message a Discord reply points at. Discord sends only a stub reference,
 * so its text and attachments have to be fetched before forwarding.
 */
export interface ReplyContext {
  id: string;
  authorId: string;
  authorIsBot: boolean;
  content: string;
  attachments: GatewayAttachment[];
}

export interface MessagePayload {
  mentioned: boolean;
  replyToBotMessageId?: string;
  replyTo?: ReplyContext;
  id: string;
  channelId: string;
  guildId: string;
  userId: string;
  applicationId: string;
  isThread: boolean;
  content: string;
  attachments: GatewayAttachment[];
}

/** Discord serves message attachments from these hosts over signed HTTPS URLs. */
const ATTACHMENT_HOSTS = new Set(["cdn.discordapp.com", "media.discordapp.net"]);

/** Discord allows at most ten attachments on a message. */
export const MAX_ATTACHMENTS = 10;

export function isHumanMessage(message: GatewayMessage): boolean {
  return Boolean(message.guildId && !message.author.bot && !message.webhookId);
}

/**
 * Keeps only attachments the agent's Discord channel can fetch, so an
 * unsupported URL never reaches the model as a dangling file part.
 */
export function messageAttachments(message: Pick<GatewayMessage, "attachments">): GatewayAttachment[] {
  const attachments: GatewayAttachment[] = [];
  for (const attachment of message.attachments?.values() ?? []) {
    if (attachments.length >= MAX_ATTACHMENTS) break;
    let url: URL | null;
    try {
      url = new URL(attachment.url);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" || !ATTACHMENT_HOSTS.has(url.hostname)) continue;
    attachments.push({
      url: url.href,
      mediaType: attachment.contentType || "application/octet-stream",
      filename: attachment.name,
    });
  }
  return attachments;
}

/**
 * Fetches the replied-to message so its text and attachments reach the agent.
 * References outside this channel are skipped because a stub can point at a
 * message the bot was never meant to read.
 */
export async function resolveReply(message: Message, botId: string): Promise<ReplyContext | undefined> {
  if (!message.reference?.messageId) return undefined;

  const referenced = await message.fetchReference().catch(() => null);
  if (!referenced || referenced.channelId !== message.channelId) return undefined;

  return {
    id: referenced.id,
    authorId: referenced.author.id,
    authorIsBot: referenced.author.id === botId,
    content: (referenced.content ?? "").trim().slice(0, 4000),
    attachments: messageAttachments(referenced),
  };
}

export function messagePayload(
  message: GatewayMessage,
  botId: string,
  replyTo?: ReplyContext,
): MessagePayload | null {
  if (!isHumanMessage(message) || !message.guildId) return null;
  const replyToBotMessageId = replyTo?.authorIsBot ? replyTo.id : undefined;

  const mention = `<@${botId}>`;
  const nickMention = `<@!${botId}>`;
  const mentioned = message.content.includes(mention) || message.content.includes(nickMention);
  const isThread = message.channel.isThread();
  if (!mentioned && !isThread && !replyToBotMessageId) return null;

  const content = message.content.replaceAll(mention, "").replaceAll(nickMention, "").trim();
  // An attachment-only message still asks something, so it isn't empty to us.
  const attachments = messageAttachments(message);
  if (!content && attachments.length === 0) return null;

  return {
    id: message.id,
    channelId: message.channelId,
    guildId: message.guildId,
    userId: message.author.id,
    applicationId: botId,
    mentioned,
    isThread,
    replyToBotMessageId,
    ...(replyTo ? { replyTo } : {}),
    content,
    attachments,
  };
}
