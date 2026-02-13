import { InteractionResponseType } from "discord-interactions";
import { CommandOptionType, cmd } from "../types.js";

export default cmd(
  {
    name: "xkcd",
    description: "xkcd comic retriever",
    options: [
      {
        name: "number",
        description: "Comic number (random if omitted)",
        type: CommandOptionType.INTEGER,
        required: false,
        min_value: 1,
      },
    ],
  },
  async ({ number: num }) => {
    try {
      if (num == null) {
        const latest = (await fetch("https://xkcd.com/info.0.json").then((r) =>
          r.json(),
        )) as { num: number };
        num = Math.floor(Math.random() * latest.num) + 1;
      }

      const comic = (await fetch(`https://xkcd.com/${num}/info.0.json`).then(
        (r) => {
          if (!r.ok) throw new Error(`Comic ${num} not found`);
          return r.json();
        },
      )) as { title: string; num: number; img: string; alt: string };

      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: {
          embeds: [
            {
              title: `#${comic.num}: ${comic.title}`,
              url: `https://xkcd.com/${comic.num}`,
              image: { url: comic.img },
              footer: { text: comic.alt },
            },
          ],
        },
      };
    } catch {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "Failed to fetch xkcd comic." },
      };
    }
  },
);
