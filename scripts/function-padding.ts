import { readdir, readFile, writeFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parseSync } from "oxc-parser";

const ROOT = resolve(fileURLToPath(import.meta.url), "../..");
const SOURCE_DIRECTORIES = ["agent", "bot", "gateway", "scripts", "tests"];
const SOURCE_FILES = ["config.ts"];
const INDENT = "  ";

interface Body {
  /** Offset of the opening brace. */
  start: number;
  /** Offset just past the closing brace. */
  end: number;
  /** Offset of the line the opening brace sits on. */
  line: number;
}

const FUNCTION_NODES = new Set([
  "ArrowFunctionExpression",
  "FunctionDeclaration",
  "FunctionExpression",
]);

const SKIPPED_DIRECTORIES = new Set([".eve", ".git", ".vercel", "node_modules"]);

/**
 * Every function body in the source, in document order. Function expressions cover
 * class methods and object methods, so this catches every brace-delimited function.
 */
export function functionBodies(source: string, filename = "file.ts"): Body[] {

  const { program, errors } = parseSync(filename, source);
  if (errors.length > 0) throw new Error(`${filename}: ${errors[0]?.message ?? "parse failed"}`);

  const bodies: Body[] = [];
  const visit = (node: unknown): void => {

    if (node === null || typeof node !== "object") return;
    const record = node as Record<string, unknown> & { type?: unknown };
    if (typeof record.type === "string" && FUNCTION_NODES.has(record.type)) {
      const body = record.body as { start?: unknown; end?: unknown; type?: unknown } | undefined;
      if (body?.type === "BlockStatement" && typeof body.start === "number" && typeof body.end === "number") {
        bodies.push({ start: body.start, end: body.end, line: lineOf(source, body.start) });
      }
    }
    for (const value of Object.values(record)) {
      if (Array.isArray(value)) {
        for (const child of value) visit(child);
      } else if (value !== null && typeof value === "object") {
        visit(value);
      }
    }
  };
  visit(program);
  return bodies;
}

function lineOf(source: string, offset: number): number {

  let line = 1;
  for (let index = 0; index < offset; index++) {
    if (source[index] === "\n") line++;
  }
  return line;
}

/** Whether a function body already has a blank first line. Empty bodies pass. */
export function hasBlankFirstLine(source: string, body: Body): boolean {

  const inner = source.slice(body.start + 1, body.end - 1);
  if (inner.trim() === "") return true;
  const [first = "", second] = inner.split("\n");
  return first.trim() === "" && second !== undefined && second.trim() === "";
}

export interface Violation {
  line: number;
  message: string;
}

export function checkSource(source: string, filename = "file.ts"): Violation[] {

  return functionBodies(source, filename)
    .filter((body) => !hasBlankFirstLine(source, body))
    .map((body) => ({
      line: body.line,
      message: "Function body must start with a blank line after `{`.",
    }));
}

/** Rewrites one function body so its first line is blank, leaving the rest intact. */
function padBody(source: string, body: Body): string {

  const inner = source.slice(body.start + 1, body.end - 1);
  if (inner.trim() === "") return source;

  const lineStart = source.lastIndexOf("\n", body.start) + 1;
  const lineIndent = /^[ \t]*/.exec(source.slice(lineStart, body.start))?.[0] ?? "";

  // Multi-line bodies just need one more newline after the brace; their own
  // indentation already sits on the following line.
  if (inner.includes("\n")) {
    return `${source.slice(0, body.start + 1)}\n${source.slice(body.start + 1)}`;
  }

  // A body written on one line has to be spread over three.
  const content = inner.trim();
  return `${source.slice(0, body.start)}{\n\n${lineIndent}${INDENT}${content}\n${lineIndent}}${source.slice(body.end)}`;
}

/** Applies the blank first line to every function body, repeating for nested bodies. */
export function fixSource(source: string, filename = "file.ts"): string {

  let current = source;
  for (let pass = 0; pass < 10; pass++) {
    const pending = functionBodies(current, filename).filter((body) => !hasBlankFirstLine(current, body));
    if (pending.length === 0) return current;
    // Fix from the end so earlier offsets stay valid within this pass.
    for (const body of pending.sort((left, right) => right.start - left.start)) {
      current = padBody(current, body);
    }
  }
  throw new Error(`${filename}: function bodies still need padding after 10 passes`);
}

async function sourceFiles(directory: string): Promise<string[]> {

  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) {
      if (!SKIPPED_DIRECTORIES.has(entry.name)) files.push(...await sourceFiles(path));
    } else if (entry.name.endsWith(".ts")) {
      files.push(path);
    }
  }
  return files;
}

export async function repositoryFiles(root = ROOT): Promise<string[]> {

  const groups = await Promise.all(SOURCE_DIRECTORIES.map((name) => sourceFiles(join(root, name))));
  return [...groups.flat(), ...SOURCE_FILES.map((name) => join(root, name))].sort();
}

async function main(): Promise<void> {

  const fix = process.argv.includes("--fix");
  const files = await repositoryFiles();
  let failures = 0;

  for (const file of files) {
    const source = await readFile(file, "utf8");
    const violations = checkSource(source, file);
    if (violations.length === 0) continue;
    failures += violations.length;
    const name = relative(ROOT, file);
    for (const violation of violations) console.error(`${name}:${violation.line} ${violation.message}`);
    if (fix) await writeFile(file, fixSource(source, file));
  }

  if (failures === 0) {
    console.log(`Function padding is clean across ${files.length} files.`);
  } else if (fix) {
    console.log(`Fixed ${failures} function bodies across ${files.length} files.`);
  } else {
    console.error(`\n${failures} function bodies need a blank first line. Run \`npm run lint:fix\`.`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
