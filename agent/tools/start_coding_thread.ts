import { defineTool } from "eve/tools";
import { z } from "zod";
import { startCodingThread } from "../lib/coding-thread.js";

export default defineTool({
  description: "Before any sandbox or coding work for a Discord self-improvement request, create or reuse a thread and immediately post a short plan. Falls back to a normal reply when threads are unavailable. This keeps the same Eve session and sandbox. Also use to post brief progress updates.",
  inputSchema: z.object({
    title: z.string().trim().min(1).max(100).describe("Short thread title describing the change"),
    plan: z.string().trim().min(1).max(1800).describe("Brief user-facing plan or meaningful progress update"),
  }),
  execute: (input, ctx) => startCodingThread(ctx.session.auth.current, input),
});
