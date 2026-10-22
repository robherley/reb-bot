import type { Message } from "discord.js";

export interface GatewayMessage {
  id: string;
  channelId: string;
  guildId: string | null;
  webhookId?: string | null;
  author: { id: string; bot: boolean };
  channel: { isThread(): boolean };
  content: string;
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
}

export function isHumanMessage(message: GatewayMessage): boolean {
  return Boolean(message.guildId && !message.author.bot && !message.webhookId);
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
  if (!content) return null;

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
  };
}
