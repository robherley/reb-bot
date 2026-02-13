import { InteractionResponseType } from "discord-interactions";
import * as cowsay from "cowsay";
import { CommandOptionType, cmd } from "../types.js";

export default cmd(
  {
    name: "cowsay",
    description: "Have a cow say something",
    options: [
      {
        name: "message",
        description: "What the cow says",
        type: CommandOptionType.STRING,
        required: true,
      },
      {
        name: "type",
        description: "Cow type",
        type: CommandOptionType.STRING,
        required: false,
      },
    ],
  },
  async ({ message, type }) => {
    const opts: cowsay.IOptions = { text: message };
    if (type) opts.f = type;

    const art = cowsay.say(opts);
    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: "```\n" + art + "\n```" },
    };
  },
);
