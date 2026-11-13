import { InteractionResponseType } from "discord-interactions";
import { CommandOptionType, cmd } from "../types.js";
import { figletFonts, renderFiglet, toMessageContent } from "../lib/figlet.js";

export default cmd(
  {
    name: "figlet",
    description: "Render text as big ASCII art",
    options: [
      {
        name: "text",
        description: "Text to turn into ASCII art",
        type: CommandOptionType.STRING,
        required: true,
        max_length: 40,
      },
      {
        name: "font",
        description: "Font to render with (defaults to Standard)",
        type: CommandOptionType.STRING,
        required: false,
        choices: figletFonts.map((font) => ({ name: font, value: font })),
      },
    ],
  },
  async ({ text, font }) => {
    const fallbackFont = figletFonts.find((f) => f === font) ?? "Standard";
    try {
      const { art } = await renderFiglet(text, fallbackFont);
      if (!art.trim()) throw new Error("Nothing to render");
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: toMessageContent(art) },
      };
    } catch {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "Couldn't render that text. Try shorter input or another font." },
      };
    }
  },
);
