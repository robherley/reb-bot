import { defineSandbox } from "eve/sandbox";
import { VercelSandbox } from "eve/sandbox/vercel";
import { installCodeTooling } from "eve/extensions/code/sandbox";

export const environment = VercelSandbox.environment({
  prepare: async (sandbox) => {

    await installCodeTooling(sandbox);
  },
});

// Always use isolated remote compute, including during local development.
// Allow arbitrary code and network access without forwarding application credentials.
export default defineSandbox(() => environment.open({
  networkPolicy: "allow-all",
  timeout: 1_800_000,
  resources: { vcpus: 2 },
}));
