import { defineTool, type ToolContext } from "eve/tools";
import { z } from "zod";

const DISCORD_API = "https://discord.com/api/v10";

const inputSchema = z.object({
  operation: z.enum(["recent_messages", "search_history", "members_and_roles"]),
  query: z
    .string()
    .trim()
    .max(100)
    .optional()
    .describe("Search text. Required for search_history; optional for member lookup."),
  limit: z.number().int().min(1).max(50).default(20),
  channelLimit: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(5)
    .describe("Maximum channels to scan during search_history."),
});

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as JsonRecord)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function discordScope(ctx: ToolContext) {
  const auth = ctx.session.auth.current;
  if (!auth?.authenticator.startsWith("discord")) {
    throw new Error("Discord context is only available in Discord sessions.");
  }

  const channelId = auth.attributes.channel_id;
  const guildId = auth.attributes.guild_id;
  if (typeof channelId !== "string") {
    throw new Error("The Discord session has no channel context.");
  }

  return {
    channelId,
    guildId: typeof guildId === "string" ? guildId : null,
  };
}

async function discordGet(path: string, signal: AbortSignal): Promise<unknown> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    throw new Error("Discord bot access is not configured.");
  }

  const response = await fetch(`${DISCORD_API}${path}`, {
    headers: { authorization: `Bot ${token}` },
    signal,
  });
  if (!response.ok) {
    throw new Error(`Discord API request failed with status ${response.status}.`);
  }
  return response.json();
}

function formatMessage(value: unknown) {
  const message = asRecord(value);
  const author = asRecord(message?.author);
  if (!message || !author) return null;

  const content = asString(message.content)?.trim();
  if (!content) return null;

  return {
    author: asString(author.global_name) ?? asString(author.username) ?? "unknown",
    content: content.slice(0, 1000),
    timestamp: asString(message.timestamp),
  };
}

async function recentMessages(channelId: string, limit: number, signal: AbortSignal) {
  const data = await discordGet(
    `/channels/${encodeURIComponent(channelId)}/messages?limit=${limit}`,
    signal,
  );
  return Array.isArray(data) ? data.map(formatMessage).filter((item) => item !== null) : [];
}

export default defineTool({
  description:
    "Read bounded Discord context from the invoking channel or guild. Use only for questions that depend on recent messages, server history, members, or roles.",
  inputSchema,
  async execute(input, ctx) {
    const { channelId, guildId } = discordScope(ctx);

    if (input.operation === "recent_messages") {
      return {
        operation: input.operation,
        messages: await recentMessages(channelId, input.limit, ctx.abortSignal),
      };
    }

    if (!guildId) {
      throw new Error("This operation requires a Discord guild session.");
    }

    if (input.operation === "search_history") {
      if (!input.query || input.query.length < 2) {
        throw new Error("History search requires a query of at least two characters.");
      }
      const rawChannels = await discordGet(
        `/guilds/${encodeURIComponent(guildId)}/channels`,
        ctx.abortSignal,
      );
      const channels = Array.isArray(rawChannels)
        ? rawChannels
            .map(asRecord)
            .filter((channel) => channel && (channel.type === 0 || channel.type === 5))
            .sort((left, right) =>
              left?.id === channelId ? -1 : right?.id === channelId ? 1 : 0,
            )
            .slice(0, input.channelLimit)
        : [];
      const query = input.query.toLocaleLowerCase();
      const matches = (
        await Promise.all(
          channels.map(async (channel) => {
            const id = asString(channel?.id);
            if (!id) return [];
            try {
              const messages = await recentMessages(id, 50, ctx.abortSignal);
              return messages
                .filter((message) => message.content.toLocaleLowerCase().includes(query))
                .map((message) => ({
                  ...message,
                  channel: asString(channel?.name) ?? "unknown",
                }));
            } catch {
              return [];
            }
          }),
        )
      )
        .flat()
        .sort((left, right) => (right.timestamp ?? "").localeCompare(left.timestamp ?? ""))
        .slice(0, input.limit);

      return { operation: input.operation, query: input.query, messages: matches };
    }

    const memberPath = input.query
      ? `/guilds/${encodeURIComponent(guildId)}/members/search?query=${encodeURIComponent(input.query)}&limit=${input.limit}`
      : `/guilds/${encodeURIComponent(guildId)}/members?limit=${input.limit}`;
    const [rawMembers, rawRoles] = await Promise.all([
      discordGet(memberPath, ctx.abortSignal),
      discordGet(`/guilds/${encodeURIComponent(guildId)}/roles`, ctx.abortSignal),
    ]);
    const roleNames = new Map(
      Array.isArray(rawRoles)
        ? rawRoles
            .map(asRecord)
            .flatMap((role): [string, string][] => {
              const id = asString(role?.id);
              const name = asString(role?.name);
              return id && name ? [[id, name]] : [];
            })
        : [],
    );
    const members = Array.isArray(rawMembers)
      ? rawMembers.map(asRecord).flatMap((member) => {
          const user = asRecord(member?.user);
          if (!member || !user) return [];
          const roles = Array.isArray(member.roles)
            ? member.roles.flatMap((role) => {
                const name = roleNames.get(String(role));
                return name ? [name] : [];
              })
            : [];
          return [
            {
              displayName:
                asString(member.nick) ??
                asString(user.global_name) ??
                asString(user.username) ??
                "unknown",
              roles,
            },
          ];
        })
      : [];

    return { operation: input.operation, members };
  },
});
