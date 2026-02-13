import { InteractionResponseType } from "discord-interactions";
import { cmd } from "../types.js";

export default cmd(
  {
    name: "ping",
    description: "Give reb-bot a ping, maybe you'll get a pong",
  },
  async (_options, interaction) => {
    const user = interaction.member?.user ?? interaction.user;
    const version = process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "dev";
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: {
        content: `\`\`\`json\n${JSON.stringify(
          {
            user: {
              id: user?.id,
              username: user?.username,
            },
            version,
          },
          null,
          2,
        )}\n\`\`\``,
      },
    };
  },
);
