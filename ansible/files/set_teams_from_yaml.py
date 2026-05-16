#!/usr/bin/env python3
import argparse
import json
import sys
import urllib.error
import urllib.request
from typing import Any

import yaml


def request_json(method: str, url: str, body: dict[str, Any] | None = None, expect: tuple[int, ...] = (200,)) -> Any:
    data = None
    headers = {}
    if body is not None:
        data = json.dumps(body).encode("utf-8")
        headers["Content-Type"] = "application/json"

    req = urllib.request.Request(url=url, data=data, method=method, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            status = resp.getcode()
            payload = resp.read().decode("utf-8")
    except urllib.error.HTTPError as e:
        status = e.code
        payload = e.read().decode("utf-8", errors="replace")
        if status not in expect:
            raise RuntimeError(f"{method} {url} failed with {status}: {payload}")
        return payload
    except Exception as e:
        raise RuntimeError(f"{method} {url} failed: {e}")

    if status not in expect:
        raise RuntimeError(f"{method} {url} unexpected status {status}: {payload}")

    if payload:
        try:
            return json.loads(payload)
        except json.JSONDecodeError:
            return payload
    return None


def load_config(path: str) -> list[dict[str, Any]]:
    with open(path, "r", encoding="utf-8") as f:
        cfg = yaml.safe_load(f) or {}

    teams = cfg.get("teams")
    if not isinstance(teams, list):
        raise ValueError("Config must contain a top-level 'teams' list")

    seen: set[str] = set()
    normalized: list[dict[str, Any]] = []

    for idx, team in enumerate(teams):
        if not isinstance(team, dict):
            raise ValueError(f"teams[{idx}] must be an object")
        team_id = str(team.get("id", "")).strip()
        name = str(team.get("name", "")).strip()
        score = team.get("score", 0)

        if not team_id:
            raise ValueError(f"teams[{idx}].id is required")
        if not name:
            raise ValueError(f"teams[{idx}].name is required")
        if team_id in seen:
            raise ValueError(f"Duplicate id in config: {team_id}")
        seen.add(team_id)

        if not isinstance(score, (int, float)):
            raise ValueError(f"teams[{idx}].score must be numeric")

        normalized.append({"id": team_id, "name": name, "score": score})

    return normalized


def main() -> int:
    parser = argparse.ArgumentParser(description="Apply team state from YAML config to STEM Race admin API")
    parser.add_argument("--config", required=True, help="Path to YAML config file")
    parser.add_argument("--public-base", default="http://127.0.0.1:8080", help="Public API base URL")
    parser.add_argument("--admin-base", default="http://127.0.0.1:8081", help="Admin API base URL")
    args = parser.parse_args()

    desired = load_config(args.config)

    state = request_json("GET", f"{args.public_base}/state", expect=(200,))
    existing = state.get("teams", []) if isinstance(state, dict) else []
    existing_by_id = {str(t["id"]): t for t in existing if isinstance(t, dict) and "id" in t}
    desired_by_id = {t["id"]: t for t in desired}

    # Delete teams not in desired config.
    for team_id in list(existing_by_id.keys()):
        if team_id not in desired_by_id:
            request_json("DELETE", f"{args.admin_base}/admin/teams/{team_id}", expect=(204, 404))
            print(f"Deleted team: {team_id}")

    # Create/update desired teams.
    for team in desired:
        team_id = team["id"]
        name = team["name"]
        score = team["score"]

        current = existing_by_id.get(team_id)
        if current is None:
            request_json(
                "POST",
                f"{args.admin_base}/admin/teams",
                body={"id": team_id, "name": name},
                expect=(201, 409),
            )
            print(f"Created team: {team_id}")
        elif str(current.get("name", "")) != name:
            request_json(
                "PATCH",
                f"{args.admin_base}/admin/teams/{team_id}",
                body={"name": name},
                expect=(200, 404),
            )
            print(f"Renamed team: {team_id} -> {name}")

        request_json(
            "POST",
            f"{args.admin_base}/admin/teams/{team_id}/score/set",
            body={"score": score},
            expect=(200, 404),
        )
        print(f"Set score: {team_id} = {score}")

    print("Applied config successfully")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        raise SystemExit(1)
