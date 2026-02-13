import { InteractionResponseType } from "discord-interactions";
import { table } from "table";
import { CommandOptionType, cmd } from "../types.js";

export default cmd(
  {
    name: "ppi",
    description: "Calculate pixels per inch of a screen",
    options: [
      {
        name: "width",
        description: "Screen width in pixels",
        type: CommandOptionType.INTEGER,
        required: true,
        min_value: 1,
      },
      {
        name: "height",
        description: "Screen height in pixels",
        type: CommandOptionType.INTEGER,
        required: true,
        min_value: 1,
      },
      {
        name: "diagonal",
        description: "Screen diagonal in inches",
        type: CommandOptionType.NUMBER,
        required: true,
        min_value: 0.1,
      },
    ],
  },
  async ({ width, height, diagonal }) => {
    const ppi = Math.sqrt(width * width + height * height) / diagonal;

    const rows = [
      ["Width", `${width}px`],
      ["Height", `${height}px`],
      ["Diagonal", `${diagonal}"`],
      ["PPI", ppi.toFixed(2)],
    ];
    const output = table(rows, {
      drawHorizontalLine: (index) =>
        index === 0 || index === rows.length - 1 || index === rows.length,
    });

    return {
      type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
      data: { content: `\`\`\`\n🖥️ PPI Calculator 📏\n${output}\`\`\`` },
    };
  },
);
