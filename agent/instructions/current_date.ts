import { defineDynamic, defineInstructions } from "eve/instructions";

export default defineDynamic(() => defineInstructions({
  content: `Current date: ${new Date().toLocaleDateString("en-US", {
    timeZone: "UTC",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "numeric",
  })} (UTC). Use this for today; do not infer today's date from conversation history. If the user specifies a timezone, use that timezone for relative dates instead.`,
}));
