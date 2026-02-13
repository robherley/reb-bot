# reb-bot

Your friendly neighborhood Discord bot 🤖

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
| `/figlet` | Render text as ASCII art |
| `/cowsay` | Have a cow say something |
| `/stonks` | Stock quote via Yahoo Finance |
| `/mc` | Check Minecraft server status |
| `/http` | HTTP status code image (cat or dog) |
| `/github-status` | GitHub component status |
| `/ppi` | Calculate pixels per inch |
