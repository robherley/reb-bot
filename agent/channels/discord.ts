import { discordChannel, discordContinuationToken, type DiscordChannelState } from "eve/channels/discord";
import { POST } from "eve/channels";
import { call } from "eve/events";
import { InteractionType } from "discord-interactions";
import { discordGatewayRoute } from "../lib/discord-gateway.js";
import interactions from "../../bot/interactions.js";
import { bindCodingThread, type CodingThreadState } from "../lib/coding-thread.js";

type VisualizationState = DiscordChannelState & { visualizationTurnId?: string };

const discord = discordChannel({
  route: "/api/interactions",
  events: {
    async "call.settled"(event, { channel, view }) {
      const result = call(view, event.data.callId);
      if (result?.kind === "tool" && result.name === "start_coding_thread"
        && event.data.outcome === "completed") {
        // Alias the thread to this session rather than starting a fresh one.
        // Eve's sandbox is session-scoped, so follow-ups retain its workspace.
        bindCodingThread(channel, event.data.output);
        return;
      }
      if (result?.kind !== "tool" || result.name !== "visualize" || event.data.outcome !== "completed") return;
      const output: unknown = event.data.output;
      if (output && typeof output === "object" && !Array.isArray(output)
        && "sent" in output && "channelId" in output && "messageId" in output
        && output.sent === true && output.channelId === channel.discord.channelId
        && typeof output.messageId === "string") {
        (channel.state as VisualizationState).visualizationTurnId = event.scope?.turnId;
        channel.continuation?.alias(discordContinuationToken({
          channelId: channel.discord.channelId,
          conversationId: output.messageId,
        }));
      }
    },
    async "content.completed"(event, { channel }) {
      if (event.data.kind !== "text" || event.data.phase !== "reply"
        || typeof event.data.value !== "string" || !event.data.value) return;
      const visualizationTurnId = (channel.state as VisualizationState).visualizationTurnId;
      if (visualizationTurnId && visualizationTurnId === event.scope?.turnId) return;
      // Eve now splits long messages and persists continuation aliases inside post().
      const replyTo = (channel.state as CodingThreadState).codingReplyMessageId;
      const message = replyTo ? {
        content: event.data.value,
        allowed_mentions: { parse: [], replied_user: false },
        message_reference: { message_id: replyTo, fail_if_not_exists: false },
      } : event.data.value;
      await channel.discord.post(message);
    },
  },
});
const nativeRoute = discord.routes.find((route) => route.method === "POST");
if (!nativeRoute || nativeRoute.method !== "POST") throw new Error("Discord interaction route missing");
const handleNative = nativeRoute.handler;

export default {
  ...discord,
  routes: [
    POST<DiscordChannelState>("/api/interactions", async (request, args) => {
      const body = await request.clone().json().catch(() => null);
      if (!body || typeof body !== "object" || !("type" in body)) return new Response("Invalid interaction", { status: 400 });
      // Both handlers verify the original signature before dispatch.
      if (body.type === InteractionType.APPLICATION_COMMAND || body.type === InteractionType.PING) {
        return interactions.fetch(request);
      }
      return handleNative(request, args);
    }),
    discordGatewayRoute,
  ],
};
