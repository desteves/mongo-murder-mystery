# Runbook (project `diana-438818`, region `us-central1`)

Services: `mongo-murder-mystery-fe` (nginx), `mmm-be` (Express API), `mmm-mcp` (private MongoDB MCP server).
Every push to `main` redeploys all three via Cloud Build triggers (MMM-FRONTEND, MMM-BACKEND, MMM-MCP).

## Before pushing a Dockerfile or dependency change
`scripts/smoke-images.sh` builds all three images and probes them. It catches startup-only dependencies, non-root
permission errors and base-image changes that refuse to bind. A bad image otherwise ships and crash-loops.

## The site returns 500 / a revision is crash-looping
1. Find the revisions and the failure:
   `gcloud run revisions list --service=<svc> --region=us-central1 --limit=3`
   `gcloud logging read 'resource.labels.revision_name="<rev>" AND severity>=WARNING' --limit=20 --freshness=30m`
2. Roll back traffic to the last good revision (instant, no rebuild):
   `gcloud run services update-traffic <svc> --region=us-central1 --to-revisions=<good-rev>=100`
3. Fix forward in the repo, push, then `--to-latest` once the new revision is healthy.
Alerts that page the `MMM alerts (email)` channel: frontend/backend uptime, Cloud Run 5xx (more than 5 in 5 minutes), and
crash/startup-probe-failure log lines.

## Rotate a secret
Secrets are Secret Manager entries mounted as `:latest` (`mmm-be-mongodb-uri`, `mmm-be-salt`, `mmm-be-internal-api-key`,
`mmm-be-openai-api-key`, `mmm-be-mdb-mcp-connection-string`, `mmm-be-clue-*`, `mmm-mcp-mdb-mcp-connection-string`).
1. Change the credential at the source (Atlas user password, OpenRouter key, ...).
2. `printf '%s' "$NEW" | gcloud secrets versions add <secret> --data-file=-`
3. Force a new revision so it is picked up: `gcloud run services update <svc> --region=us-central1 --update-labels=rotated=$(date +%s)`
4. Check `/health` (backend) and a real query. Disable the old version once healthy:
   `gcloud secrets versions disable <n> --secret=<secret>`
Frontend `VITE_MMM_API_KEY` is a build argument and public by design; changing it needs a rebuild and the matching
`INTERNAL_API_KEY` secret.

## `/agent` problems
- `MCP init failed: 403`: the backend did not send an ID token, or `mmm-be-sa` lost `run.invoker` on `mmm-mcp`
  (`gcloud run services get-iam-policy mmm-mcp --region=us-central1`).
- `session not found` (404, -32003): an MCP revision rolled out mid-request (sessions are in memory). Retry.
- OpenRouter `404 ... guardrail` / `429 free-models-per-day`: a model/provider is not allowed for the account, or the free
  daily quota is used up. Change `OPENAI_MODEL` (`gcloud run services update mmm-be --update-env-vars=OPENAI_MODEL=<slug>`).
- `Agent reached step limit`: read the `MCP tool result` log lines to see what the tools returned.

## Scaling and limits (set explicitly)
- Backend: concurrency 30 (Mongo pool is 10), max 10 instances, min 1, HTTP startup probe on `/health`, 300 s timeout,
  app-level `REQUEST_TIMEOUT_MS=60000`.
- Frontend: concurrency 80, max 10 instances, min 1, HTTP startup probe on `/healthz`.
- MCP: max 1 instance (in-memory sessions), private.
