import type { RequestHandler } from "express";
import { Router } from "express";

import {
  changeTeamScore,
  createTeam,
  deleteTeam,
  resetTeamScore,
  setTeamScore,
  updateTeamName,
} from "../store/memoryStore.js";

export function requireAdminPort(adminPort: number): RequestHandler {
  return (req, res, next) => {
    if (req.socket.localPort !== adminPort) {
      res.status(404).json({ error: "not_found" });
      return;
    }

    next();
  };
}

function readString(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readNumber(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  return value;
}

export function createAdminRouter() {
  const router = Router();

  router.get("/healthz", (_req, res) => {
    res.status(200).json({ ok: true });
  });

  router.get("/ping", (_req, res) => {
    res.status(200).json({ ok: true, admin: true });
  });

  router.post("/teams", (req, res) => {
    const id = readString(req.body?.id);
    const name = readString(req.body?.name);
    if (!id || !name) {
      res.status(400).json({ error: "invalid_payload", message: "id and name are required" });
      return;
    }

    try {
      const team = createTeam({ id, name });
      res.status(201).json(team);
    } catch (error: unknown) {
      if (error instanceof Error && error.message === "duplicate_id") {
        res.status(409).json({ error: "duplicate_id" });
        return;
      }
      res.status(500).json({ error: "internal_error" });
    }
  });

  router.patch("/teams/:id", (req, res) => {
    const name = readString(req.body?.name);
    if (!name) {
      res.status(400).json({ error: "invalid_payload", message: "name is required" });
      return;
    }

    const team = updateTeamName(req.params.id, name);
    if (!team) {
      res.status(404).json({ error: "team_not_found" });
      return;
    }

    res.status(200).json(team);
  });

  router.delete("/teams/:id", (req, res) => {
    const deleted = deleteTeam(req.params.id);
    if (!deleted) {
      res.status(404).json({ error: "team_not_found" });
      return;
    }

    res.status(204).send();
  });

  router.post("/teams/:id/score/set", (req, res) => {
    const score = readNumber(req.body?.score);
    if (score === null) {
      res.status(400).json({ error: "invalid_payload", message: "score must be a finite number" });
      return;
    }

    const team = setTeamScore(req.params.id, score);
    if (!team) {
      res.status(404).json({ error: "team_not_found" });
      return;
    }

    res.status(200).json(team);
  });

  router.post("/teams/:id/score/inc", (req, res) => {
    const by = readNumber(req.body?.by ?? 1);
    if (by === null) {
      res.status(400).json({ error: "invalid_payload", message: "by must be a finite number" });
      return;
    }

    const team = changeTeamScore(req.params.id, by);
    if (!team) {
      res.status(404).json({ error: "team_not_found" });
      return;
    }

    res.status(200).json(team);
  });

  router.post("/teams/:id/score/dec", (req, res) => {
    const by = readNumber(req.body?.by ?? 1);
    if (by === null) {
      res.status(400).json({ error: "invalid_payload", message: "by must be a finite number" });
      return;
    }

    const team = changeTeamScore(req.params.id, -by);
    if (!team) {
      res.status(404).json({ error: "team_not_found" });
      return;
    }

    res.status(200).json(team);
  });

  router.post("/teams/:id/score/reset", (req, res) => {
    const team = resetTeamScore(req.params.id);
    if (!team) {
      res.status(404).json({ error: "team_not_found" });
      return;
    }

    res.status(200).json(team);
  });

  return router;
}
