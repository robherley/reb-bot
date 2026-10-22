import { discordChannel, discordContinuationToken, splitDiscordMessageContent, type DiscordChannelState } from "eve/channels/discord";
import { POST } from "eve/channels";
import { InteractionType } from "discord-interactions";
import { discordGatewayRoute } from "../lib/discord-gateway.js";
import interactions from "../../bot/interactions.js";

const discord = discordChannel({
  route: "/api/interactions",
  events: {
    async "message.completed"(event, channel) {
      if (event.finishReason === "tool-calls" || !event.message) return;
      for (const content of splitDiscordMessageContent(event.message)) {
        const posted = await channel.discord.post(content);
        if (posted.id) {
          channel.continuation?.alias(discordContinuationToken(channel.discord.channelId, posted.id));
        }
      }
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
