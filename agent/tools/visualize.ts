import { defineTool } from "eve/tools";
import { renderVisualization, visualizationSchema } from "../lib/visualize.js";

export default defineTool({
  description: "Render a bar/line chart or a small flow diagram as a PNG and send it with an explanation in the current Discord channel. Use real supplied/retrieved data; label illustrative data explicitly. Diagram nodes are laid out in input order, two per row; prefer short labels and adjacent edges. The image is already sent by this tool; do not send it again.",
  inputSchema: visualizationSchema,
  async execute(input, ctx) {
    const auth = ctx.session.auth.current;
    const channelId = auth?.attributes.channel_id;
    if (!auth?.authenticator.startsWith("discord") || typeof channelId !== "string" || !/^\d+$/.test(channelId)) {
      throw new Error("Visualization requires an authenticated Discord channel.");
    }
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) throw new Error("Discord bot access is not configured.");
    const png = renderVisualization(input);
    const form = new FormData();
    form.set("payload_json", JSON.stringify({
      allowed_mentions: { parse: [] },
      embeds: [{ title: input.title, description: input.explanation, color: 0x79b8ff, image: { url: "attachment://diagram.png" } }],
      attachments: [{ id: 0, filename: "diagram.png", description: input.title }],
    }));
    form.set("files[0]", new Blob([new Uint8Array(png)], { type: "image/png" }), "diagram.png");
    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST", headers: { authorization: `Bot ${token}` }, body: form,
      signal: AbortSignal.timeout(30_000),
    });
    if (!response.ok) throw new Error(`Discord visualization upload failed (${response.status}).`);
    const posted = await response.json() as { id: string };
    return { sent: true, channelId, messageId: posted.id, title: input.title };
  },
});
