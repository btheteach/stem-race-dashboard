# STEM Race Dashboard

Lightweight two-port scoring server for STEM race day.

- Public port: serves dashboard UI and read-only endpoints.
- Admin port: serves write endpoints for team and score updates.

## Features

- Public scoreboard UI (Vue + Vite build output)
- Public read API (`/state`, `/healthz`)
- Admin write API for team CRUD and score operations
- Single Express app bound to separate public/admin listeners
- In-memory state (no persistence)

## Tech Stack

- Node.js + TypeScript
- Express
- Vue 3 + Vite

## Prerequisites

- Node.js 20+
- npm 10+

## Quick Start

```bash
npm install
npm run build
node dist/server/index.js
```

Open:

- Dashboard: `http://<host>:8080/`
- Public state: `http://<host>:8080/state`

## Configuration

Environment variables:

- `PUBLIC_HOST` (default: `0.0.0.0`)
- `PUBLIC_PORT` (default: `8080`)
- `ADMIN_HOST` (default: `127.0.0.1`)
- `ADMIN_PORT` (default: `8081`)

Example:

```bash
PUBLIC_PORT=8080 ADMIN_PORT=8081 node dist/server/index.js
```

## Development

```bash
npm run dev:server
```

Client dev server (optional UI-only iteration):

```bash
npm run dev
```

## Build

```bash
npm run build
```

This builds:

- Server output to `dist/server`
- Client output to `dist/public`

## Test

```bash
npm test
```

## Usage: Admin API

Create team:

```bash
curl -sS -X POST http://127.0.0.1:8081/admin/teams \
  -H 'content-type: application/json' \
  -d '{"id":"red","name":"Red Rockets"}'
```

Rename team:

```bash
curl -sS -X PATCH http://127.0.0.1:8081/admin/teams/red \
  -H 'content-type: application/json' \
  -d '{"name":"Red Comets"}'
```

Set score:

```bash
curl -sS -X POST http://127.0.0.1:8081/admin/teams/red/score/set \
  -H 'content-type: application/json' \
  -d '{"score":10}'
```

Increment score:

```bash
curl -sS -X POST http://127.0.0.1:8081/admin/teams/red/score/inc \
  -H 'content-type: application/json' \
  -d '{"by":1}'
```

Decrement score:

```bash
curl -sS -X POST http://127.0.0.1:8081/admin/teams/red/score/dec \
  -H 'content-type: application/json' \
  -d '{"by":1}'
```

Reset score:

```bash
curl -sS -X POST http://127.0.0.1:8081/admin/teams/red/score/reset
```

Delete team:

```bash
curl -sS -X DELETE http://127.0.0.1:8081/admin/teams/red
```

## Usage: Public API

Health check:

```bash
curl -sS http://<host>:8080/healthz
```

Current state:

```bash
curl -sS http://<host>:8080/state
```

## Production Notes

- Keep the admin port network-restricted (firewall/NACL/security group).
- This version uses in-memory storage; data is lost on restart.
- For long-running deployments, run under a process manager (for example `systemd`, `pm2`, or container orchestration).

## Troubleshooting

- If `/` shows fallback HTML, run `npm run build` to generate client assets.
- If port bind fails, verify the ports are free and host binding is allowed in your environment.
