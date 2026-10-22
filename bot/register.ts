import { definitions } from "./commands/index.js";

interface RegisteredCommand {
  id: string;
  name: string;
}

export async function registerCommands(
  token = process.env.DISCORD_BOT_TOKEN ?? process.env.DISCORD_TOKEN,
): Promise<RegisteredCommand[]> {
  if (!token) throw new Error("DISCORD_BOT_TOKEN must be set");

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bot ${token}`,
  };
  const appResponse = await fetch(
    "https://discord.com/api/v10/oauth2/applications/@me",
    { headers },
  );
  if (!appResponse.ok) {
    throw new Error(`Discord application lookup failed (${appResponse.status})`);
  }
  const app = (await appResponse.json()) as { id: string };

  // Bulk overwrite updates the complete command set, including removals.
  // No separate delete pass is needed.
  const response = await fetch(
    `https://discord.com/api/v10/applications/${app.id}/commands`,
    { method: "PUT", headers, body: JSON.stringify(definitions) },
  );
  if (!response.ok) {
    throw new Error(`Discord command registration failed (${response.status})`);
  }

  const commands = (await response.json()) as RegisteredCommand[];
  console.log(
    `Registered ${commands.length} commands: ${commands.map(({ name }) => name).join(", ")}`,
  );
  return commands;
}
