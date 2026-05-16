import assert from "node:assert/strict";
import net from "node:net";
import test from "node:test";

import { createApp } from "./app.js";
import { startServers } from "./servers.js";
import { resetState } from "./store/memoryStore.js";

function getFreePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        reject(new Error("Could not reserve port"));
        return;
      }

      const { port } = address;
      server.close((err) => {
        if (err) {
          reject(err);
          return;
        }

        resolve(port);
      });
    });
  });
}

test("public routes are readable and admin routes are port-guarded", async (t) => {
  resetState();

  const publicPort = await getFreePort();
  const adminPort = await getFreePort();

  const app = createApp(adminPort);
  const started = await startServers(app, {
    publicPort,
    publicHost: "127.0.0.1",
    adminPort,
    adminHost: "127.0.0.1",
  });

  t.after(async () => {
    await started.close();
  });

  const publicBase = `http://127.0.0.1:${publicPort}`;
  const adminBase = `http://127.0.0.1:${adminPort}`;

  const publicHealth = await fetch(`${publicBase}/healthz`);
  assert.equal(publicHealth.status, 200);

  const publicState = await fetch(`${publicBase}/state`);
  assert.equal(publicState.status, 200);
  assert.deepEqual(await publicState.json(), { teams: [] });

  const dashboard = await fetch(`${publicBase}/`);
  assert.equal(dashboard.status, 200);
  assert.match(dashboard.headers.get("content-type") ?? "", /^text\/html\b/);
  assert.match(await dashboard.text(), /<!doctype html>/i);

  const deepLink = await fetch(`${publicBase}/race/day-1`);
  assert.equal(deepLink.status, 200);
  assert.match(deepLink.headers.get("content-type") ?? "", /^text\/html\b/);

  const missingAsset = await fetch(`${publicBase}/missing.js`);
  assert.equal(missingAsset.status, 404);

  const adminHealth = await fetch(`${adminBase}/admin/healthz`);
  assert.equal(adminHealth.status, 200);

  const adminPingPublic = await fetch(`${publicBase}/admin/ping`);
  assert.equal(adminPingPublic.status, 404);

  const adminPingAdmin = await fetch(`${adminBase}/admin/ping`);
  assert.equal(adminPingAdmin.status, 200);
});

test("admin write endpoints mutate state and public state reflects updates", async (t) => {
  resetState();

  const publicPort = await getFreePort();
  const adminPort = await getFreePort();

  const app = createApp(adminPort);
  const started = await startServers(app, {
    publicPort,
    publicHost: "127.0.0.1",
    adminPort,
    adminHost: "127.0.0.1",
  });

  t.after(async () => {
    await started.close();
  });

  const publicBase = `http://127.0.0.1:${publicPort}`;
  const adminBase = `http://127.0.0.1:${adminPort}`;

  const create = await fetch(`${adminBase}/admin/teams`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "red", name: "Red Rockets" }),
  });
  assert.equal(create.status, 201);

  const duplicate = await fetch(`${adminBase}/admin/teams`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "red", name: "Duplicate" }),
  });
  assert.equal(duplicate.status, 409);

  const invalid = await fetch(`${adminBase}/admin/teams`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "", name: "" }),
  });
  assert.equal(invalid.status, 400);

  const rename = await fetch(`${adminBase}/admin/teams/red`, {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "Red Comets" }),
  });
  assert.equal(rename.status, 200);

  const setScore = await fetch(`${adminBase}/admin/teams/red/score/set`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ score: 10 }),
  });
  assert.equal(setScore.status, 200);

  const incScore = await fetch(`${adminBase}/admin/teams/red/score/inc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ by: 4 }),
  });
  assert.equal(incScore.status, 200);

  const decScore = await fetch(`${adminBase}/admin/teams/red/score/dec`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ by: 3 }),
  });
  assert.equal(decScore.status, 200);

  const resetScore = await fetch(`${adminBase}/admin/teams/red/score/reset`, {
    method: "POST",
  });
  assert.equal(resetScore.status, 200);

  const publicState = await fetch(`${publicBase}/state`);
  assert.equal(publicState.status, 200);
  assert.deepEqual(await publicState.json(), {
    teams: [{ id: "red", name: "Red Comets", score: 0 }],
  });

  const publicWrite = await fetch(`${publicBase}/admin/teams`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ id: "blue", name: "Blue Blazers" }),
  });
  assert.equal(publicWrite.status, 404);

  const deleteTeam = await fetch(`${adminBase}/admin/teams/red`, {
    method: "DELETE",
  });
  assert.equal(deleteTeam.status, 204);

  const missing = await fetch(`${adminBase}/admin/teams/missing/score/inc`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ by: 1 }),
  });
  assert.equal(missing.status, 404);
});
