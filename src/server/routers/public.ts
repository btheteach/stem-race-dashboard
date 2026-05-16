import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { Router } from "express";

import { fallbackIndexHtml } from "../static/fallbackIndexHtml.js";
import { getState } from "../store/memoryStore.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const distPublicDir = path.resolve(__dirname, "../../../dist/public");
const builtIndexPath = path.join(distPublicDir, "index.html");

export function createPublicRouter() {
  const router = Router();

  if (existsSync(distPublicDir)) {
    router.use(express.static(distPublicDir));
  }

  router.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  router.get("/state", (_req, res) => {
    res.status(200).json(getState());
  });

  const sendDashboardHtml = (res: express.Response) => {
    if (existsSync(builtIndexPath)) {
      res.sendFile(builtIndexPath);
      return true;
    }

    res.status(200).type("html").send(fallbackIndexHtml);
    return true;
  };

  router.get("/", (_req, res) => {
    sendDashboardHtml(res);
  });

  router.get("/{*path}", (req, res, next) => {
    if (req.path.startsWith("/admin")) {
      next();
      return;
    }

    if (path.extname(req.path)) {
      next();
      return;
    }

    sendDashboardHtml(res);
  });

  return router;
}
