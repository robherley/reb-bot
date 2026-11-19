import type { SessionAuthContext } from "eve/context";
import type { DiscordChannelState } from "eve/channels/discord";

const SNOWFLAKE = /^\d+$/;

/**
 * Discord's `SUPPRESS_EMBEDS` message flag (`1 << 2`). Without it Discord expands
 * every link in a reply into an embed, so answers pile up card previews below the text.
 */
export const SUPPRESS_EMBEDS = 1 << 2;

/** Discord message body for a reply: no link previews, and no pings either. */
export interface ReplyMessage {
  content: string;
  flags: number;
  allowed_mentions?: { parse: []; replied_user: false };
  message_reference?: { message_id: string; fail_if_not_exists: false };
}

/** Channel state plus the reply anchor a coding thread binds to its first plan message. */
export type ReplyState = DiscordChannelState & { codingReplyMessageId?: string };

function snowflakeAttribute(auth: SessionAuthContext | null | undefined, name: string): string | undefined {
  const value = auth?.attributes[name];
  return typeof value === "string" && SNOWFLAKE.test(value) ? value : undefined;
}

/**
 * The Discord message this turn's reply should reference, so a conversation reads
 * as a chain instead of loose messages.
 *
 * Coding threads keep referencing their plan message. Otherwise the reply points at
 * the message that triggered the turn, which the Gateway relay records as
 * `message_id` in the session auth attributes. Pass `null` for the auth when the
 * reply leaves as an interaction follow-up, because Discord rejects message
 * references on interaction responses.
 */
export function replyToMessageId(
  state: ReplyState,
  auth: SessionAuthContext | null | undefined,
): string | undefined {
  const codingReply = state.codingReplyMessageId;
  if (codingReply && SNOWFLAKE.test(codingReply)) return codingReply;

  const messageId = snowflakeAttribute(auth, "message_id");
  if (!messageId) return undefined;
  // A reference that crosses channels fails to send, so only reply within this one.
  if (snowflakeAttribute(auth, "channel_id") !== state.channelId) return undefined;
  return messageId;
}

/**
 * Reply content that suppresses link embeds and references `replyTo` without pinging
 * anyone. Always returns a body object, because the embed flag lives on the message.
 */
export function replyBody(content: string, replyTo: string | undefined): ReplyMessage {
  if (!replyTo) return { content, flags: SUPPRESS_EMBEDS };
  return {
    content,
    flags: SUPPRESS_EMBEDS,
    allowed_mentions: { parse: [], replied_user: false },
    message_reference: { message_id: replyTo, fail_if_not_exists: false },
  };
}
