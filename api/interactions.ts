import {
  InteractionResponseType,
  InteractionType,
  verifyKey,
} from "discord-interactions";
import { handlers } from "../src/commands/index.js";
import type { Interaction } from "../src/types.js";

export default {
  async fetch(req: Request) {
    if (req.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405 });
    }

    const signature = req.headers.get("x-signature-ed25519") ?? "";
    const timestamp = req.headers.get("x-signature-timestamp") ?? "";
    const rawBody = await req.text();

    const isValid = await verifyKey(
      rawBody,
      signature,
      timestamp,
      process.env.DISCORD_PUBLIC_KEY!,
    );

    if (!isValid) {
      return new Response("Invalid request signature", { status: 401 });
    }

    const interaction: Interaction = JSON.parse(rawBody);

    if (interaction.type === InteractionType.PING) {
      return Response.json({ type: InteractionResponseType.PONG });
    }

    if (interaction.type === InteractionType.APPLICATION_COMMAND) {
      const name = interaction.data?.name;
      if (!name) {
        return new Response("No command name", { status: 400 });
      }

      const commandHandler = handlers.get(name);

      if (!commandHandler) {
        return Response.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: `Unknown command: ${name}` },
        });
      }

      try {
        const response = await commandHandler(interaction);
        return Response.json(response);
      } catch (err) {
        console.error(`Error handling command ${name}:`, err);
        return Response.json({
          type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
          data: { content: "Something went wrong." },
        });
      }
    }

    return new Response("Unknown interaction type", { status: 400 });
  },
};
