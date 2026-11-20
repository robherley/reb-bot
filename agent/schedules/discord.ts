import { defineDynamicSchedules } from "eve/experimental/schedules";
import { z } from "zod";
import discord from "../channels/discord.js";
import { scheduleDestination, scheduledTaskMessage } from "../lib/schedule.js";

export default defineDynamicSchedules({
  description:
    "Manage recurring or one-time tasks that run in this Discord channel. The schedule posts into the channel it was created in, runs as the person who created it, and needs no one present to run. Timing is a cron expression with an IANA timezone, a single local date and time, or a delay in minutes.",
  inputSchema: z
    .object({
      task: z.string().min(1).max(2000),
    })
    .strict(),
  preparePayload(payload, context) {
    const attributes = context.session.auth.current?.attributes
      ?? context.session.auth.initiator?.attributes;
    return { task: payload.task, ...scheduleDestination(attributes) };
  },
  auth({ payload }) {
    return {
      attributes: {
        channel_id: payload.channelId,
        guild_id: payload.guildId,
      },
    };
  },
  async run({ payload, occurrence, to }) {
    await to(discord, { channelId: payload.channelId }).send(
      scheduledTaskMessage(payload, occurrence.displayName ?? occurrence.name),
      { idempotencyKey: `${occurrence.executionId}:task` },
    );
  },
});
