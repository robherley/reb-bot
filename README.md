# reb-bot

Your friendly neighborhood Discord bot 🤖

Slash commands use the original handlers in `bot/commands/`. Mentions use an Eve
agent with GPT-6 Luna Fast (low reasoning) and a persistent TypeScript Gateway
daemon. Both reply as the same Discord bot.

## AI mentions and deployment

Use Node.js 24. Run `npm run dev` for Eve locally and `npm run build` for deployment.
The existing Discord Interactions Endpoint URL stays **`/api/interactions`**:
slash commands go to reb-bot, while Eve handles its approval buttons and modals.
`api/interactions.ts` has moved to `bot/interactions.ts`; Eve now mounts the URL.

Set these Vercel **Production** variables for the **reb-bot** project:

- `DISCORD_BOT_TOKEN`, `DISCORD_PUBLIC_KEY`, `DISCORD_APPLICATION_ID`: reb-bot's credentials.
- `DISCORD_GATEWAY_SECRET`: generate a fresh secret with `openssl rand -hex 32`.
- `DISCORD_GATEWAY_APP_URL`: reb-bot's stable production origin.
- Optionally `DISCORD_GUILD_ID` to restrict mentions to one server.
- `VERCEL_AUTOMATION_BYPASS_SECRET` if Deployment Protection covers the production app.

Enable **Message Content Intent on reb-bot's application** in Discord, and allow
the bot to view channels and send messages (including in threads). On Vercel,
select the **Eve** framework preset for this project and use Node.js 24. Deploy
to production to start the daemon configured in `vercel.toml`.

Existing registered slash commands need no re-registration. `npm run register`
continues to register all seven commands; do not use Rev's `/ask` registration
script. The registration script accepts `DISCORD_BOT_TOKEN` or the legacy
`DISCORD_TOKEN` variable.

Rev's separate deployment does not need to run for reb-bot to work. After testing
the merged bot, stop Rev's daemon if you no longer want that separate bot online.

See [`gateway/README.md`](gateway/README.md) for
daemon development and mention behavior. Repeated mentions in a thread share
an AI session; after the first mention, human messages in that thread receive
automatic replies. Direct replies to AI messages continue the original session
without a mention. Top-level mentions start independent sessions.

Checks: `npm run typecheck` and `npm run build`.

All code shares the root `package.json`, lockfile, and TypeScript configuration.
`Dockerfile.gateway` builds the gateway using the repository root as its context.

## Setup

You'll need the following environment variables:

```sh
DISCORD_PUBLIC_KEY=
DISCORD_BOT_TOKEN=
```

Install dependencies:

```console
npm i
```

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
