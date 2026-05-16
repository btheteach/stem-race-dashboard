# COMMANDS

Copy/paste `curl` commands for all API operations.

Defaults used below:

```bash
PUBLIC_BASE="http://127.0.0.1:8080"
ADMIN_BASE="http://127.0.0.1:8081"
```

## Public API

### Health check

```bash
curl -sS "$PUBLIC_BASE/healthz"
```

### Get current state

```bash
curl -sS "$PUBLIC_BASE/state"
```

## Admin API

### Admin health check

```bash
curl -sS "$ADMIN_BASE/admin/healthz"
```

### Admin ping

```bash
curl -sS "$ADMIN_BASE/admin/ping"
```

### Create team

```bash
curl -sS -X POST "$ADMIN_BASE/admin/teams" \
  -H 'content-type: application/json' \
  -d '{"id":"red","name":"Red Rockets"}'
```

### Rename team

```bash
curl -sS -X PATCH "$ADMIN_BASE/admin/teams/red" \
  -H 'content-type: application/json' \
  -d '{"name":"Red Comets"}'
```

### Delete team

```bash
curl -sS -X DELETE "$ADMIN_BASE/admin/teams/red"
```

### Set team score

```bash
curl -sS -X POST "$ADMIN_BASE/admin/teams/red/score/set" \
  -H 'content-type: application/json' \
  -d '{"score":10}'
```

### Increment team score

```bash
curl -sS -X POST "$ADMIN_BASE/admin/teams/red/score/inc" \
  -H 'content-type: application/json' \
  -d '{"by":1}'
```

### Decrement team score

```bash
curl -sS -X POST "$ADMIN_BASE/admin/teams/red/score/dec" \
  -H 'content-type: application/json' \
  -d '{"by":1}'
```

### Reset team score

```bash
curl -sS -X POST "$ADMIN_BASE/admin/teams/red/score/reset"
```

## Quick flow example

```bash
PUBLIC_BASE="http://127.0.0.1:8080"; ADMIN_BASE="http://127.0.0.1:8081";
curl -sS -X POST "$ADMIN_BASE/admin/teams" -H 'content-type: application/json' -d '{"id":"red","name":"Red Rockets"}';
curl -sS -X POST "$ADMIN_BASE/admin/teams/red/score/inc" -H 'content-type: application/json' -d '{"by":3}';
curl -sS "$PUBLIC_BASE/state";
```

## EC2 Deployment + HTTPS Proxy

```bash
ansible-playbook -i ansible/inventory.yaml ansible/run-server-service.yaml
ansible-playbook -i ansible/inventory.yaml ansible/setup-https-proxy.yaml \
  -e "dashboard_domain=dashboard.yourdomain.com caddy_admin_email=you@yourdomain.com"
```
