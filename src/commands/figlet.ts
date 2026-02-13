import { InteractionResponseType } from "discord-interactions";
import figlet from "figlet";
import { CommandOptionType, cmd } from "../types.js";

export default cmd(
  {
    name: "figlet",
    description: "Runs figlet on input text",
    options: [
      {
        name: "message",
        description: "Text to render",
        type: CommandOptionType.STRING,
        required: true,
        max_length: 21,
      },
    ],
  },
  async ({ message }) => {
    const art = await figlet.text(message);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "```\n" + art + "\n```" },
    };
  },
);
