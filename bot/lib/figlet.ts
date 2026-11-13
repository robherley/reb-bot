import figlet from "figlet";

/** Discord's hard limit for a single message's content. */
export const MAX_MESSAGE_LENGTH = 2000;

/** Room reserved for the surrounding code fence and trailing ellipsis. */
const FENCE_OVERHEAD = 12;

export const figletFonts = [
  "Standard",
  "Big",
  "Slant",
  "Small",
  "Mini",
  "Banner3-D",
  "Block",
  "Bubble",
  "Digital",
  "Ghost",
  "Ivrit",
  "Script",
  "Shadow",
  "Speed",
  "3-D",
] as const;

export type FigletFont = (typeof figletFonts)[number];

export interface RenderedFiglet {
  /** The rendered art, without any surrounding code fence. */
  art: string;
  /** True when the art was clipped to fit in a Discord message. */
  truncated: boolean;
}

/**
 * Render `text` as ASCII art with figlet, clipping the result so it always fits
 * inside a single Discord message (including a fenced code block).
 */
export async function renderFiglet(
  text: string,
  font: FigletFont = "Standard",
): Promise<RenderedFiglet> {
  const art = (
    await figlet.text(text, { font, width: 80, whitespaceBreak: true })
  )
    .replace(/\s+$/, "")
    // A literal ``` would terminate the surrounding code fence.
    .replace(/```/g, "'''");

  const limit = MAX_MESSAGE_LENGTH - FENCE_OVERHEAD;
  if (art.length <= limit) return { art, truncated: false };

  return { art: `${art.slice(0, limit - 4)}\n...`, truncated: true };
}

/** Wrap rendered art in a Discord code block, if it fits. */
export function toMessageContent(art: string): string {
  return `\`\`\`\n${art}\n\`\`\``;
}
