import { createRequire } from "node:module";
import { Resvg } from "@resvg/resvg-js";
import { z } from "zod";

const label = z.string().trim().min(1).max(48);
export const visualizationSchema = z.object({
  title: z.string().trim().min(1).max(100),
  explanation: z.string().trim().min(1).max(2000),
  visual: z.discriminatedUnion("kind", [
    z.object({
      kind: z.enum(["bar", "line"]),
      labels: z.array(z.string().trim().min(1).max(18)).min(1).max(12),
      series: z.array(z.object({
        name: z.string().trim().min(1).max(24),
        values: z.array(z.number().min(-1e15).max(1e15)).min(1).max(12),
      })).min(1).max(4),
      unit: z.string().max(24),
    }),
    z.object({
      kind: z.literal("diagram"),
      nodes: z.array(z.object({ id: label, label })).min(1).max(8),
      edges: z.array(z.object({ from: label, to: label, label: z.string().max(32) })).max(12),
    }),
  ]),
});

type Visualization = z.infer<typeof visualizationSchema>;
const colors = ["#79b8ff", "#7ee2b8", "#ffc778", "#d6a4ff"];
const escape = (value: string) => value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]!);
const text = (x: number, y: number, value: string, size = 18, anchor = "start") =>
  `<text x="${x}" y="${y}" font-size="${size}" text-anchor="${anchor}" fill="#edf2fa">${escape(value)}</text>`;

export function renderVisualization(input: Visualization): Buffer {
  const { visual } = visualizationSchema.parse(input);
  const parts = [text(40, 50, input.title, Math.min(26, 1500 / input.title.length))];
  if (visual.kind === "diagram") {
    const ids = new Set(visual.nodes.map((node) => node.id));
    if (ids.size !== visual.nodes.length || visual.edges.some((edge) => !ids.has(edge.from) || !ids.has(edge.to))) {
      throw new Error("Diagram nodes need unique IDs and edges must reference existing IDs.");
    }
    const positions = new Map(visual.nodes.map((node, i) => [node.id, { x: 70 + (i % 2) * 510, y: 120 + Math.floor(i / 2) * 145 }]));
    for (const edge of visual.edges) {
      const from = positions.get(edge.from)!;
      const to = positions.get(edge.to)!;
      if (edge.from === edge.to) throw new Error("Self-loop edges are not supported.");
      const horizontal = from.y === to.y;
      const forward = horizontal ? to.x > from.x : to.y > from.y;
      const x1 = from.x + (horizontal ? (forward ? 360 : 0) : 180);
      const y1 = from.y + (horizontal ? 35 : (forward ? 70 : 0));
      const x2 = to.x + (horizontal ? (forward ? 0 : 360) : 180);
      const y2 = to.y + (horizontal ? 35 : (forward ? 0 : 70));
      parts.push(`<path d="M${x1},${y1} L${x2},${y2}" stroke="#8ea6c4" stroke-width="2" marker-end="url(#arrow)"/>`);
      parts.push(text((x1 + x2) / 2, (y1 + y2) / 2 - 8, edge.label, 13, "middle"));
    }
    for (const node of visual.nodes) {
      const { x, y } = positions.get(node.id)!;
      parts.push(`<rect x="${x}" y="${y}" width="360" height="70" rx="12" fill="#22334e" stroke="#79b8ff"/>`);
      const words = node.label.match(/.{1,28}(?:\s|$)|.{1,28}/g) ?? [];
      words.forEach((line, i) => parts.push(text(x + 180, y + 30 + i * 22, line.trim(), 18, "middle")));
    }
  } else {
    if (visual.series.some((series) => series.values.length !== visual.labels.length)) {
      throw new Error("Each series must have one value per label.");
    }
    const values = visual.series.flatMap((series) => series.values);
    const min = Math.min(0, ...values);
    const max = Math.max(0, ...values) || (min === 0 ? 1 : 0);
    const y = (value: number) => 550 - (value - min) / (max - min) * 400;
    const step = 840 / visual.labels.length;
    const x = (index: number) => 140 + step * (index + 0.5);
    parts.push(text(40, 95, visual.unit, 16));
    for (let i = 0; i <= 5; i++) {
      const value = min + (max - min) * i / 5;
      parts.push(`<path d="M140,${y(value)} H980" stroke="#33435a"/>`);
      parts.push(text(125, y(value) + 5, Intl.NumberFormat("en", { notation: "compact", maximumSignificantDigits: 3 }).format(value), 15, "end"));
    }
    parts.push(`<path d="M140,${y(0)} H980" stroke="#edf2fa"/>`);
    visual.labels.forEach((name, i) => parts.push(`<g transform="translate(${x(i)},575) rotate(25)">${text(0, 0, name, 12)}</g>`));
    visual.series.forEach((series, s) => {
      const color = colors[s];
      parts.push(`<rect x="${140 + s * 215}" y="115" width="12" height="12" fill="${color}"/>`, text(158 + s * 215, 127, series.name, 13));
      if (visual.kind === "line") {
        parts.push(`<polyline points="${series.values.map((value, i) => `${x(i)},${y(value)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="3"/>`);
        series.values.forEach((value, i) => parts.push(`<circle cx="${x(i)}" cy="${y(value)}" r="4" fill="${color}"/>`));
      } else {
        const width = step * 0.75 / visual.series.length;
        series.values.forEach((value, i) => parts.push(`<rect x="${x(i) - step * 0.375 + s * width}" y="${Math.min(y(0), y(value))}" width="${width - 2}" height="${Math.abs(y(value) - y(0))}" fill="${color}"/>`));
      }
    });
  }
  const height = visual.kind === "diagram" ? 230 + (Math.ceil(visual.nodes.length / 2) - 1) * 145 : 680;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1040" height="${height}" font-family="DejaVu Sans"><rect width="1040" height="${height}" fill="#111b2b"/><defs><marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8" fill="#8ea6c4"/></marker></defs>${parts.join("")}</svg>`;
  const require = createRequire(import.meta.url);
  return new Resvg(svg, { font: { loadSystemFonts: false, fontFiles: [require.resolve("dejavu-fonts-ttf/ttf/DejaVuSans.ttf")] } }).render().asPng();
}
