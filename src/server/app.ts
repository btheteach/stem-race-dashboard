import express from "express";
import type { NextFunction, Request, Response } from "express";

import { createAdminRouter, requireAdminPort } from "./routers/admin.js";
import { createPublicRouter } from "./routers/public.js";

export function createApp(adminPort: number) {
  const app = express();

  app.use(express.json());

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();

    res.on("finish", () => {
      const ms = Date.now() - start;
      console.log(`${req.method} ${req.originalUrl} ${res.statusCode} ${ms}ms`);
    });

    next();
  });

  app.use(createPublicRouter());
  app.use("/admin", requireAdminPort(adminPort), createAdminRouter());

  return app;
}
