import type { SessionAuthContext } from "eve/context";
import type { DiscordChannelState } from "eve/channels/discord";

const SNOWFLAKE = /^\d+$/;

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

/** Reply content that references `replyTo` without pinging anyone. */
export function replyBody(
  content: string,
  replyTo: string | undefined,
): string | {
  content: string;
  allowed_mentions: { parse: []; replied_user: false };
  message_reference: { message_id: string; fail_if_not_exists: false };
} {
  if (!replyTo) return content;
  return {
    content,
    allowed_mentions: { parse: [], replied_user: false },
    message_reference: { message_id: replyTo, fail_if_not_exists: false },
  };
}
