# Discord mentions on Vercel

This TypeScript daemon keeps a Discord Gateway WebSocket open with discord.js (including
automatic heartbeats/reconnects). It forwards explicit `@bot` messages to
`POST /api/discord/gateway`. That protected route uses the existing Eve Discord
channel for durable runs, typing, replies, and approval components. Slash
commands keep working at `/api/interactions`.

## Code layout

- `index.ts`: starts the gateway.
- `config.ts`: loads and validates environment settings.
- `gateway.ts`: Discord client, event handlers, and graceful shutdown.
- `messages.ts`: human-message filtering, reply lookup, and payload creation.
- `forward.ts`: authenticated HTTP delivery with timeouts and retries.

## Production setup

Set these **Production** environment variables on the Vercel project:

| Variable | Value |
| --- | --- |
| `DISCORD_BOT_TOKEN` | Existing Discord bot token, used by the daemon and Eve replies. |
| `DISCORD_GATEWAY_SECRET` | A new random shared secret, e.g. `openssl rand -hex 32`. |
| `DISCORD_GATEWAY_APP_URL` | Stable production origin, e.g. `https://rev.example.com`. Do not use a preview URL. |
| `DISCORD_GUILD_ID` | Optional: restrict both the daemon and endpoint to one server. |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Needed if Deployment Protection covers the app; create a Protection Bypass for Automation secret in Vercel settings. |

Keep the existing `DISCORD_APPLICATION_ID` and `DISCORD_PUBLIC_KEY` for slash
commands. Do not change the Discord Interactions Endpoint URL.

In Discord Developer Portal → your application → **Bot**, enable **Message
Content Intent**. The bot needs **View Channel**, **Send Messages**, and **Send
Messages in Threads** in the channels where it should respond. Native approval
components still arrive through the existing Interactions Endpoint.

Deploy the project to **production**. `vercel.toml` starts one `discord-gateway`
daemon in `iad1`. Look for `Discord Gateway connected as …` in Vercel logs, then
send `@bot hello` in a server channel.

## Conversation behavior and reliability

- A mention starts an AI conversation. Bot/webhook messages and DMs are ignored.
  Mention-only messages are ignored too.
- Each top-level mention starts a session and replies in the same channel.
  Mentions within a Discord thread share a session and reply in that thread.
  Once activated by a mention, threads automatically forward human messages to
  the same session. Unrelated threads remain quiet. This does not auto-create threads.
- Direct Discord replies to AI responses continue their session without a mention
  (even with reply pings disabled). Every chunk of an AI reply has a durable session
  alias. Replies to legacy slash-command output require a mention to start AI work.
  Responses sent before this feature was deployed may not have an alias.
- This forwarder is text-only; attachments are not forwarded.
- Network errors, HTTP 429, and server errors are retried up to five attempts.
  The Discord message ID is an Eve idempotency key, including during daemon
  rollout overlap. Eve retains the most recent 1,024 keys per session.
- Shutdown closes the Gateway and drains in-flight HTTP deliveries for up to
  25 seconds. Vercel restarts crashed processes. There is no durable delivery
  queue: messages can be missed during downtime or after exhausted retries;
  failures are logged with their message ID, not message content.
- Daemons currently run in production only. Keep one instance unless you add
  Discord sharding/coordination. Environment changes require a new deployment.

## Local checks

From the repository root:

```sh
npm run typecheck
npm run build
npm ci
```

To run locally, use Node.js 24+, start Eve with `npm run dev`, set
`DISCORD_GATEWAY_APP_URL=http://localhost:3000` (adjust to Eve's port) in your
local environment, and add the required variables from the table above to
`.env.local`. Then run:

```sh
npm run gateway
```

Avoid running the local listener against the production bot at the same time
as the deployed daemon; use a separate development bot/server instead.
