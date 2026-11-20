/** Discord snowflake id: digits only, as Discord issues them. */
const SNOWFLAKE = /^\d{5,25}$/;

/** Channel and server a dynamic schedule posts into. */
export interface ScheduleDestination {
  readonly channelId: string;
  readonly guildId: string;
}

/** The payload eve stores for a dynamic schedule and replays on every occurrence. */
export interface ScheduledTask {
  readonly task: string;
  readonly channelId: string;
  readonly guildId: string;
}

function snowflake(value: unknown): string | undefined {
  return typeof value === "string" && SNOWFLAKE.test(value) ? value : undefined;
}

/**
 * Reads the destination from the trusted caller's session attributes, never from the
 * model, so a schedule can't be aimed at a channel its creator isn't talking in.
 *
 * Schedules belong to a Discord conversation, so a caller without one (delegated work,
 * a web request) is rejected instead of guessing a channel.
 */
export function scheduleDestination(attributes: Record<string, unknown> | null | undefined): ScheduleDestination {
  const channelId = snowflake(attributes?.channel_id);
  if (!channelId) throw new Error("Schedules can only be created from a Discord channel or thread.");
  return { channelId, guildId: snowflake(attributes?.guild_id) ?? "" };
}

/**
 * The message an occurrence sends into the captured channel. Naming the schedule keeps
 * several schedules in one channel distinguishable, and quoting the task keeps the
 * agent's session prompt identical across provider retries.
 */
export function scheduledTaskMessage(payload: ScheduledTask, displayName: string): string {
  return `run scheduled task "${displayName}": ${payload.task}`;
}
