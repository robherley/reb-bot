import { defineSandbox } from "eve/sandbox";
import { VercelSandbox } from "eve/sandbox/vercel";

export const environment = VercelSandbox.environment();

// Always use isolated remote compute, including during local development.
// Allow arbitrary code and network access without forwarding application credentials.
export default defineSandbox(() => environment.open({
  networkPolicy: "allow-all",
  timeout: 300_000,
  resources: { vcpus: 2 },
}));
