import { definitions } from "../src/commands/index.js";

const TOKEN = process.env.DISCORD_TOKEN;

if (!TOKEN) {
  console.error("DISCORD_TOKEN must be set");
  process.exit(1);
}

const headers = {
  "Content-Type": "application/json",
  Authorization: `Bot ${TOKEN}`,
};

const app = (await fetch(
  "https://discord.com/api/v10/oauth2/applications/@me",
  { headers },
).then((r) => r.json())) as { id: string };

const existing = (await fetch(
  `https://discord.com/api/v10/applications/${app.id}/commands`,
  { headers },
).then((r) => r.json())) as { id: string; name: string }[];

console.log(`Deleting ${existing.length} existing global commands...`);
await Promise.all(
  existing.map((cmd) =>
    fetch(
      `https://discord.com/api/v10/applications/${app.id}/commands/${cmd.id}`,
      { method: "DELETE", headers },
    ),
  ),
);

console.log(`Registering ${definitions.length} commands for app ${app.id}...`);

const res = await fetch(
  `https://discord.com/api/v10/applications/${app.id}/commands`,
  {
    method: "PUT",
    headers,
    body: JSON.stringify(definitions),
  },
);

if (!res.ok) {
  console.error(`Failed: ${res.status} ${res.statusText}`);
  console.error(await res.text());
  process.exit(1);
}

const data = await res.json();
console.log(
  `Registered ${(data as unknown[]).length} commands:`,
  (data as { name: string }[]).map((c) => c.name).join(", "),
);
