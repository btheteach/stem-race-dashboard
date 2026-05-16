import { createApp } from "./app.js";
import { startServers, type ServerConfig } from "./servers.js";

function readNumber(name: string, fallback: number) {
  const raw = process.env[name];
  if (!raw) return fallback;

  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new Error(`${name} must be a valid TCP port`);
  }

  return parsed;
}

export function readConfig(): ServerConfig {
  return {
    publicPort: readNumber("PUBLIC_PORT", 8080),
    publicHost: process.env.PUBLIC_HOST ?? "0.0.0.0",
    adminPort: readNumber("ADMIN_PORT", 8081),
    adminHost: process.env.ADMIN_HOST ?? "127.0.0.1",
  };
}

export async function main() {
  const config = readConfig();
  const app = createApp(config.adminPort);
  await startServers(app, config);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
}
