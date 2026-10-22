import { InteractionResponseType } from "discord-interactions";
import { cmd } from "../types.js";

const IGNORE_ID = "0l2p9nhqnxpd";

const STATUS_EMOJI: Record<string, string> = {
  operational: "🟢",
  degraded_performance: "🟡",
  partial_outage: "🟡",
  major_outage: "🔴",
};

interface StatusSummary {
  status: { description: string };
  components: {
    id: string;
    name: string;
    status: string;
    description: string;
  }[];
}

export default cmd(
  {
    name: "github-status",
    description: "Returns GitHub status",
  },
  async () => {
    try {
      const data = (await fetch(
        "https://www.githubstatus.com/api/v2/summary.json",
      ).then((r) => r.json())) as StatusSummary;

      const lines = [`**🐙GitHub Status:** ${data.status.description}`, ""];
      const sorted = data.components.slice().sort((a, b) => a.name.localeCompare(b.name));
      for (const c of sorted) {
        if (c.id === IGNORE_ID) continue;
        const emoji = STATUS_EMOJI[c.status] ?? "❓";
        lines.push(
          `${emoji} **${c.name}**: ${c.description ?? "<no description>"}`,
        );
      }

      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: lines.join("\n") },
      };
    } catch {
      return {
        type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
        data: { content: "Failed to fetch GitHub status." },
      };
    }
  },
);
