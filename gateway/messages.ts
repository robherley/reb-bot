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

export interface MessagePayload {
  mentioned: boolean;
  replyToBotMessageId?: string;
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

export async function resolveBotReply(message: Message, botId: string): Promise<string | undefined> {
  if (!message.reference?.messageId) return undefined;

  const referenced = await message.fetchReference().catch(() => null);
  if (referenced?.author.id === botId && referenced.channelId === message.channelId) {
    return referenced.id;
  }

  return undefined;
}

export function messagePayload(
  message: GatewayMessage,
  botId: string,
  replyToBotMessageId?: string,
): MessagePayload | null {
  if (!isHumanMessage(message) || !message.guildId) return null;

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
    content,
    attachments,
  };
}
