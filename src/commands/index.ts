import type { CommandHandler, SlashCommandDefinition } from "../types.js";

import ping from "./ping.js";
import xkcd from "./xkcd.js";
import figlet from "./figlet.js";
import cowsay from "./cowsay.js";
import stonks from "./stonks.js";
import minecraft from "./minecraft.js";
import http from "./http.js";
import githubStatus from "./github-status.js";
import ppi from "./ppi.js";

interface Command {
  definition: SlashCommandDefinition;
  handler: CommandHandler;
}

const allCommands: Command[] = [
  ping,
  xkcd,
  figlet,
  cowsay,
  stonks,
  minecraft,
  http,
  githubStatus,
  ppi,
];

export const handlers = new Map<string, CommandHandler>(
  allCommands.map((c) => [c.definition.name, c.handler]),
);

export const definitions = allCommands.map((c) => c.definition);
