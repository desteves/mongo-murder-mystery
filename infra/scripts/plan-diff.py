#!/usr/bin/env python3
"""Print only what a Terraform plan would change on EXISTING resources (updates and replacements).

    terraform plan -out="$TMPDIR/mmm.tfplan" && terraform show -json "$TMPDIR/mmm.tfplan" | python3 scripts/plan-diff.py

Keep the plan file outside the repo (a plan holds sensitive values). Attributes marked sensitive are masked.
"""
import json
import sys


def walk(before, after, path=""):
    if isinstance(before, dict) and isinstance(after, dict):
        for k in sorted(set(before) | set(after)):
            yield from walk(before.get(k), after.get(k), f"{path}.{k}" if path else k)
    elif isinstance(before, list) and isinstance(after, list) and len(before) == len(after):
        for i, (b, a) in enumerate(zip(before, after)):
            yield from walk(b, a, f"{path}[{i}]")
    elif before != after:
        yield path, before, after


def short(v):
    s = json.dumps(v, sort_keys=True)
    return s if len(s) < 160 else s[:157] + "..."


plan = json.load(sys.stdin)
shown = 0
for rc in plan.get("resource_changes", []):
    actions = rc["change"]["actions"]
    if actions in (["no-op"], ["read"], ["create"]) or rc["change"].get("importing") and actions == ["no-op"]:
        continue
    before, after = rc["change"].get("before"), rc["change"].get("after")
    if before is None or after is None:
        continue
    unknown = rc["change"].get("after_unknown", {})
    replace = rc["change"].get("replace_paths", [])
    print(f"\n## {rc['address']}  [{'+'.join(actions)}]" + (f"  replace because of: {replace}" if replace else ""))
    for path, b, a in walk(before, after):
        top = path.split(".")[0].split("[")[0]
        if a is None and unknown.get(top):
            a = "(known after apply)"
        print(f"  {path}: {short(b)} -> {short(a) if a != '(known after apply)' else a}")
    shown += 1
print(f"\n{shown} resource(s) with changes")
