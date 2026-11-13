import { InteractionResponseType } from "discord-interactions";
import { CommandOptionType, cmd } from "../types.js";

export default cmd(
  {
    name: "random",
    description: "Roll a random integer in a range",
    options: [
      {
        name: "min",
        description: "Lowest possible value (default 1)",
        type: CommandOptionType.INTEGER,
        required: false,
      },
      {
        name: "max",
        description: "Highest possible value (default 100)",
        type: CommandOptionType.INTEGER,
        required: false,
      },
    ],
  },
  async ({ min = 1, max = 100 }) => {
    if (min > max) {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "`min` must be less than or equal to `max`." },
      };
    }

    const value = Math.floor(Math.random() * (max - min + 1)) + min;
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: `🎲 ${value}` },
    };
  },
);
