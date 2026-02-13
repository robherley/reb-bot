import { InteractionResponseType } from "discord-interactions";
import { status as mcStatus } from "minecraft-server-util";
import { CommandOptionType, cmd } from "../types.js";

const SERVERS = [{ name: "mc.reb.gg", host: "mc.reb.gg", port: 25565 }];

export default cmd(
  {
    name: "mc",
    description: "Check minecraft server status",
    options: [
      {
        name: "server",
        description: "Server to check",
        type: CommandOptionType.STRING,
        required: true,
        choices: SERVERS.map((s) => ({ name: s.name, value: s.name })),
      },
    ],
  },
  async ({ server: serverName }) => {
    const server = SERVERS.find((s) => s.name === serverName);
    if (!server) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "Unknown server." },
      };
    }

    try {
      const result = await mcStatus(server.host, server.port, {
        timeout: 2000,
      });

      const motd =
        typeof result.motd === "string"
          ? result.motd
          : (result.motd?.clean ?? "");

      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: server.name,
              thumbnail: { url: "https://i.imgur.com/5DnHbTs.png" },
              color: 0x42be65,
              fields: [
                { name: "Status", value: "Online", inline: true },
                {
                  name: "Players",
                  value: `${result.players.online}/${result.players.max}`,
                  inline: true,
                },
                {
                  name: "Version",
                  value: result.version?.name ?? "Unknown",
                  inline: true,
                },
                {
                  name: "Latency",
                  value: `${result.roundTripLatency}ms`,
                  inline: true,
                },
                { name: "MOTD", value: motd || "N/A" },
              ],
            },
          ],
        },
      };
    } catch {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: server.name,
              color: 0xfa4d56,
              fields: [{ name: "Status", value: "Offline" }],
            },
          ],
        },
      };
    }
  },
);
