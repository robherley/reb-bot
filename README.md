# reb-bot

Your friendly neighborhood Discord bot 🤖

## Deployment

Deploy to Vercel with the **Eve** framework preset and **Node.js 24**.
Set these project environment variables:

| Variable | Value |
| --- | --- |
| `DISCORD_BOT_TOKEN` | Discord bot token |
| `DISCORD_PUBLIC_KEY` | Discord application public key |
| `DISCORD_APPLICATION_ID` | Discord application ID |
| `DISCORD_GATEWAY_SECRET` | Shared secret; generate with `openssl rand -hex 32` |
| `DISCORD_GATEWAY_APP_URL` | Production origin, e.g. `https://reb.wtf` |
| `DISCORD_GUILD_ID` | Optional: restrict the bot to one server |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Required if Deployment Protection covers the app |

Set Discord's Interactions Endpoint URL to `https://<your-domain>/api/interactions`
and enable **Message Content Intent**. See the [gateway README](gateway/README.md)
for daemon setup and local development.

## Self-improvement PRs

Reb edits `robherley/reb-bot` in an isolated Vercel sandbox and opens draft PRs.
GitHub credentials are injected at the network firewall, never handed to the sandbox.

**Setup**

- Attach the `github/reb-bot` Vercel Connect connector to the deployment.
- Install its GitHub App on `robherley/reb-bot` with **Contents**, **Pull requests**,
  and **Issues** read/write, plus **Checks** and **Actions** read.
- Subscribe to `issue_comment`, `pull_request_review_comment`, and `issues`; Connect
  forwards verified events to `/eve/v1/github`.
- Configure access in [`config.ts`](config.ts): `developers` holds `{ github, discord }`
  pairs linking each person's GitHub login to their numeric Discord ID. An empty
  array disables publishing.

Both accounts resolve to the same developer, and Eve credits that GitHub user via
its noreply address in PR descriptions and signed commits.

**Using it**

Ask reb in Discord, mention `@reb-bot` in a GitHub issue or PR comment, or open an
issue as an allowed user. Discord requests open a thread with a short plan first,
and follow-ups continue the same session and sandbox. That needs **Create Public
Threads** and **Send Messages in Threads** permissions; add them to the app's default
install, since existing servers may need a role or channel tweak. Without threads,
reb answers in the channel instead.

Reb branches from current main, installs dependencies, edits and checks the code,
then returns a draft PR link. Review comments continue on the same branch; merging
stays with the maintainer.

For a new environment, run `npx eve add channel/github --skip-install` so the
customized channel survives, then attach the connector to any extra Vercel
environments.

## Registering Commands

Slash commands must be [registered with Discord](https://discord.com/developers/docs/interactions/application-commands#registering-a-command) before use:

```console
npm run register
```

## Commands

| Command | Description |
|---------|-------------|
| `/ping` | Pong |
| `/xkcd` | Fetch an xkcd comic (random or by number) |
| `/stonks` | Stock quote via Yahoo Finance |
| `/mc` | Check Minecraft server status |
| `/http` | HTTP status code image (cat or dog) |
| `/github-status` | GitHub component status |
| `/ppi` | Calculate pixels per inch |
