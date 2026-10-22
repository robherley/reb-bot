export interface GatewayConfig {
  token: string;
  url: URL;
  secret: string;
  guildId?: string;
  bypassSecret?: string;
}

export function loadConfig(env: NodeJS.ProcessEnv = process.env): GatewayConfig {
  function required(name: string): string {
    const value = env[name];
    if (!value) throw new Error(`${name} must be set`);
    return value;
  }

  return {
    token: required("DISCORD_BOT_TOKEN"),
    url: gatewayUrl(required("DISCORD_GATEWAY_APP_URL")),
    secret: required("DISCORD_GATEWAY_SECRET"),
    guildId: env.DISCORD_GUILD_ID,
    bypassSecret: env.VERCEL_AUTOMATION_BYPASS_SECRET,
  };
}

export function gatewayUrl(origin: string): URL {
  const url = new URL(origin);
  const secure = url.protocol === "https:";
  const local = url.protocol === "http:" && url.hostname === "localhost";

  if (url.username || url.password || (!secure && !local)) {
    throw new Error("DISCORD_GATEWAY_APP_URL must use HTTPS (except http://localhost)");
  }

  return new URL("/api/discord/gateway", url);
}
