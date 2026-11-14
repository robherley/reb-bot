import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";
import { checkSource, fixSource, repositoryFiles } from "../scripts/function-padding.js";

test("flags a function body that starts on the opening line", () => {

  const violations = checkSource("function answer() {\n  return 42;\n}\n");
  assert.deepEqual(violations.map((violation) => violation.line), [1]);
  assert.match(violations[0]?.message ?? "", /blank line/);
});

test("flags one-line and comment-first function bodies", () => {

  assert.equal(checkSource("const double = (value: number) => { return value * 2; };\n").length, 1);
  assert.equal(checkSource("function go() {\n  // step\n  step();\n}\n").length, 1);
  assert.equal(checkSource("class Store {\n  load() {\n    return 1;\n  }\n}\n").length, 1);
});

test("accepts padded bodies and leaves expression bodies alone", () => {

  const padded = [
    "function answer() {",
    "",
    "  return 42;",
    "}",
    "const double = (value: number) => value * 2;",
    "const later = (value: number) => {",
    "",
    "  return value;",
    "};",
    "function nothing() {}",
    "",
  ].join("\n");
  assert.deepEqual(checkSource(padded), []);
});

test("fixSource pads bodies without touching the rest of the file", () => {

  const source = [
    "function answer(): number { return 42; }",
    "const double = (value: number) => { return value * 2; };",
    "function nested() {",
    "  return [1].map((value) => { return value; });",
    "}",
    "",
  ].join("\n");
  const fixed = fixSource(source);
  assert.deepEqual(checkSource(fixed), []);
  assert.equal(
    fixed,
    [
      "function answer(): number {",
      "",
      "  return 42;",
      "}",
      "const double = (value: number) => {",
      "",
      "  return value * 2;",
      "};",
      "function nested() {",
      "",
      "  return [1].map((value) => {",
      "",
      "    return value;",
      "  });",
      "}",
      "",
    ].join("\n"),
  );
  assert.equal(fixSource(fixed), fixed);
});

test("every source file starts its function bodies with a blank line", async () => {

  const offenders: string[] = [];
  for (const file of await repositoryFiles()) {
    const source = await readFile(file, "utf8");
    for (const violation of checkSource(source, file)) offenders.push(`${file}:${violation.line}`);
  }
  assert.deepEqual(offenders, [], `Run \`npm run lint:fix\` to pad these functions:\n${offenders.join("\n")}`);
});
