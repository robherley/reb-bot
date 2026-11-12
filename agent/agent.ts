import { defineAgent } from "eve";

export default defineAgent({
  model: "deepseek/deepseek-v4.1-flash-1017",
  reasoning: "low",
  build: { externalDependencies: ["@resvg/resvg-js", "dejavu-fonts-ttf"] },
});
