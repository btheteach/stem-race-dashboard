import http from "node:http";
import type { Express } from "express";

export type ServerConfig = {
  publicPort: number;
  publicHost: string;
  adminPort: number;
  adminHost: string;
};

export type StartedServers = {
  publicServer: http.Server;
  adminServer: http.Server;
  close: () => Promise<void>;
};

function listen(server: http.Server, port: number, host: string): Promise<void> {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function closeServer(server: http.Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }

      resolve();
    });
  });
}

export async function startServers(app: Express, config: ServerConfig): Promise<StartedServers> {
  const publicServer = http.createServer(app);
  const adminServer = http.createServer(app);

  await listen(publicServer, config.publicPort, config.publicHost);
  await listen(adminServer, config.adminPort, config.adminHost);

  const publicAddress = publicServer.address();
  const adminAddress = adminServer.address();

  console.log(`Public listener: http://${config.publicHost}:${typeof publicAddress === "object" && publicAddress ? publicAddress.port : config.publicPort}`);
  console.log(`Admin listener: http://${config.adminHost}:${typeof adminAddress === "object" && adminAddress ? adminAddress.port : config.adminPort}`);

  return {
    publicServer,
    adminServer,
    close: async () => {
      await Promise.all([closeServer(publicServer), closeServer(adminServer)]);
    },
  };
}
