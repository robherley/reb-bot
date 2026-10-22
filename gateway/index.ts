import { loadConfig } from "./config.ts";
import { startGateway } from "./gateway.ts";

await startGateway(loadConfig());
