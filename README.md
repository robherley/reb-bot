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
