import { InteractionResponseType, InteractionType } from "discord-interactions";

export interface Interaction {
  type: InteractionType;
  data?: {
    name: string;
    options?: InteractionOption[];
  };
  token: string;
  application_id: string;
  member?: { user: { id: string; username: string } };
  user?: { id: string; username: string };
}

export interface InteractionOption {
  name: string;
  value: string | number | boolean;
  type: number;
}

export interface InteractionResponse {
  type: InteractionResponseType;
  data?: {
    content?: string;
    embeds?: Embed[];
    flags?: number;
  };
}

export interface Embed {
  title?: string;
  url?: string;
  description?: string;
  color?: number;
  image?: { url: string };
  footer?: { text: string };
  fields?: { name: string; value: string; inline?: boolean }[];
}

export type CommandHandler = (
  interaction: Interaction
) => Promise<InteractionResponse>;

export interface SlashCommandDefinition {
  name: string;
  description: string;
  options?: readonly SlashCommandOption[];
}

export enum CommandOptionType {
  STRING = 3,
  INTEGER = 4,
  BOOLEAN = 5,
  NUMBER = 10,
}

export interface SlashCommandOption {
  name: string;
  description: string;
  type: CommandOptionType;
  required?: boolean;
  min_value?: number;
  max_value?: number;
  max_length?: number;
  choices?: readonly { name: string; value: string | number }[];
}

type OptionTypeMap = {
  [CommandOptionType.STRING]: string;
  [CommandOptionType.INTEGER]: number;
  [CommandOptionType.BOOLEAN]: boolean;
  [CommandOptionType.NUMBER]: number;
};

type InferOptionType<O extends SlashCommandOption> =
  O extends { choices: readonly { value: infer V }[] }
    ? V
    : OptionTypeMap[O["type"]];

type InferOptions<D extends SlashCommandDefinition> =
  D extends { options: readonly SlashCommandOption[] }
    ? {
        [K in D["options"][number] as K["name"]]: K extends { required: true }
          ? InferOptionType<K>
          : InferOptionType<K> | undefined;
      }
    : Record<string, never>;

export function cmd<const D extends SlashCommandDefinition>(
  definition: D,
  handler: (
    options: InferOptions<D>,
    interaction: Interaction,
  ) => Promise<InteractionResponse>,
): { definition: SlashCommandDefinition; handler: CommandHandler } {
  return {
    definition,
    handler: async (interaction) => {
      const options: Record<string, unknown> = {};
      if (definition.options) {
        for (const opt of definition.options) {
          options[opt.name] = interaction.data?.options?.find(
            (o) => o.name === opt.name,
          )?.value;
        }
      }
      return handler(options as InferOptions<D>, interaction);
    },
  };
}
