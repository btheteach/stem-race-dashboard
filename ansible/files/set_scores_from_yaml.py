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


def load_scores(path: str) -> list[dict[str, Any]]:
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
        score = team.get("score")

        if not team_id:
            raise ValueError(f"teams[{idx}].id is required")
        if team_id in seen:
            raise ValueError(f"Duplicate id in config: {team_id}")
        seen.add(team_id)

        if not isinstance(score, (int, float)):
            raise ValueError(f"teams[{idx}].score must be numeric")

        normalized.append({"id": team_id, "score": score})

    return normalized


def main() -> int:
    parser = argparse.ArgumentParser(description="Set only team scores from YAML config via STEM Race admin API")
    parser.add_argument("--config", required=True, help="Path to YAML config file")
    parser.add_argument("--admin-base", default="http://127.0.0.1:8081", help="Admin API base URL")
    args = parser.parse_args()

    scores = load_scores(args.config)

    for team in scores:
        team_id = team["id"]
        score = team["score"]
        request_json(
            "POST",
            f"{args.admin_base}/admin/teams/{team_id}/score/set",
            body={"score": score},
            expect=(200,),
        )
        print(f"Set score: {team_id} = {score}")

    print("Applied score updates successfully")
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as e:
        print(f"ERROR: {e}", file=sys.stderr)
        raise SystemExit(1)
