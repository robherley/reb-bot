import { InteractionResponseType } from "discord-interactions";
import { CommandOptionType, cmd } from "../types.js";

export default cmd(
  {
    name: "http",
    description: "Describe an HTTP status code",
    options: [
      {
        name: "code",
        description: "HTTP status code",
        type: CommandOptionType.INTEGER,
        required: true,
      },
      {
        name: "animal",
        description: "Cat or dog?",
        type: CommandOptionType.STRING,
        required: false,
        choices: [
          { name: "cat", value: "cat" },
          { name: "dog", value: "dog" },
        ],
      },
    ],
  },
  async ({ code, animal }) => {
    const url =
      animal === "dog"
        ? `https://http.dog/${code}.jpg`
        : `https://http.cat/${code}`;

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: url },
    };
  },
);
