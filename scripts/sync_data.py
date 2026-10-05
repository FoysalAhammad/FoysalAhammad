#!/usr/bin/env python3
"""Sync public repo + release snapshots into data/ (runs in GitHub Actions)."""
import json, os, sys, urllib.request, datetime, pathlib

OWNER = "FoysalAhammad"
ROOT = pathlib.Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
UA = {"User-Agent": "portfolio-sync", "Accept": "application/vnd.github+json"}


def get(url):
    req = urllib.request.Request(url, headers=UA)
    with urllib.request.urlopen(req, timeout=30) as r:
        return json.load(r)


def main():
    DATA.mkdir(exist_ok=True)
    now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    repos = get(f"https://api.github.com/users/{OWNER}/repos?per_page=100&sort=updated")
    keep = [r for r in repos if not r.get("private")]
    keep.sort(key=lambda r: r.get("pushed_at") or "", reverse=True)
    repo_out = {
        "synced_at": now,
        "count": len(keep),
        "repos": [
            {
                "name": r["name"],
                "description": r.get("description") or "",
                "url": r["html_url"],
                "homepage": r.get("homepage") or "",
                "language": r.get("language") or "",
                "stars": r.get("stargazers_count", 0),
                "fork": bool(r.get("fork")),
                "archived": bool(r.get("archived")),
                "topics": r.get("topics", [])[:4],
                "pushed_at": r.get("pushed_at") or "",
                "updated_at": r.get("updated_at") or "",
            }
            for r in keep
            if not r.get("fork")
        ],
    }

    # latest releases: newest first, prefer one per repo, then fill up to 5
    rels = []
    for r in keep[:12]:
        try:
            for rel in get(f"https://api.github.com/repos/{OWNER}/{r['name']}/releases?per_page=10"):
                rels.append(
                    {
                        "repo": r["name"],
                        "tag": rel.get("tag_name") or "",
                        "name": rel.get("name") or rel.get("tag_name") or "",
                        "url": rel.get("html_url") or "",
                        "published_at": rel.get("published_at") or "",
                        "prerelease": bool(rel.get("prerelease")),
                        "draft": bool(rel.get("draft")),
                    }
                )
        except Exception as e:
            print(f"skip {r['name']}: {e}", file=sys.stderr)

    rels = [x for x in rels if not x["draft"] and x["published_at"]]
    rels.sort(key=lambda x: x["published_at"], reverse=True)
    picked, seen = [], set()
    for x in rels:                      # pass 1: newest per repo
        if x["repo"] not in seen and len(picked) < 5:
            seen.add(x["repo"])
            picked.append(x)
    for x in rels:                      # pass 2: fill remaining slots
        if len(picked) >= 5:
            break
        if x not in picked:
            picked.append(x)

    rel_out = {"synced_at": now, "count": len(picked), "releases": picked[:5]}

    for name, payload in (("repos.json", repo_out), ("releases.json", rel_out)):
        path = DATA / name
        old = path.read_text() if path.exists() else ""
        new = json.dumps(payload, indent=1, ensure_ascii=False)
        if old != new:
            path.write_text(new + "\n")
            print(f"updated {name}")


if __name__ == "__main__":
    main()
