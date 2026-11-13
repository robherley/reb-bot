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

Reb uses Eve's file tools and git extension to edit `robherley/reb-bot` in an isolated
Vercel sandbox and publish draft PRs. GitHub credentials are injected at the
network firewall rather than exposed to sandbox processes.

The `github/reb-bot` Vercel Connect connector must be attached to the deployment.
Install its GitHub App on `robherley/reb-bot` with **Contents**, **Pull requests**,
and **Issues** read/write, plus **Checks** and **Actions** read permissions.
Subscribe to `issue_comment`, `pull_request_review_comment`, and `issues`;
Connect forwards verified events to `/eve/v1/github`.

Edit the shared [`config.ts`](config.ts) to configure access:

| Setting | Value |
| --- | --- |
| `developers` | Array of `{ github, discord }` entries pairing each developer's GitHub login and numeric Discord user ID; an empty array disables publishing |

Both accounts resolve to the same developer. Eve credits the linked GitHub user
in new PR descriptions and signed-commit messages, including work requested from
Discord, using the account's GitHub noreply email address.

Ask reb in Discord to implement a change, or mention `@reb-bot` in a GitHub issue
or PR comment. New issues opened by an allowed GitHub user also start a turn.
For Discord coding requests, reb first opens a thread and posts its plan before
starting the sandbox. The thread continues the same Eve session, so follow-up
messages reuse its workspace and sandbox lifecycle. The bot needs **Create Public
Threads** and **Send Messages in Threads** permissions. Include these in the
Discord application's default install permissions; existing servers may need role
or channel permission updates. If threads are unavailable, reb replies in the
original channel and keeps the same session.
Reb branches from current main, installs dependencies, edits and checks the code,
then returns a draft PR link. Review comments can request updates or CI fixes on
the same branch. Merging stays with the maintainer.

For a new environment, run `npx eve add channel/github --skip-install` to configure
Connect without replacing the customized channel. Attach the connector to any
additional Vercel environments used for testing.

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
