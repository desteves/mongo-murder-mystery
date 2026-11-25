# Infrastructure (Terraform)

Everything MMM runs on in GCP project `diana-438818`, modelled on `desteves/mongodb-playground/infra`: flat root module
composed of small modules. **Written against the live project but never planned or applied** (see "Status").

| Module | Manages |
|---|---|
| `apis` | Enabled Google APIs (never disabled on destroy: the project is shared) |
| `iam` | Runtime service accounts `mmm-{fe,be,mcp}-sa`, their roles, deployer `serviceAccountUser` |
| `secrets` | Secret Manager secrets + per-service `secretAccessor` (values are NOT in Terraform) |
| `runtime` | Cloud Run: frontend (nginx), backend (Express), MCP (private) + who may invoke them |
| `network` | Serverless VPC connector, regional external/internal load balancers, NEGs, Cloud Armor policy, IPs |
| `cicd` | Cloud Build triggers (GitHub push to `main`), including the frontend build-arg fix below |
| `observability` | Email channel, uptime checks, 5xx / crash / downtime alert policies |

Not managed here: Atlas (cluster, users, Private Service Connect endpoints `murder-*`), Cloudflare (DNS, origin
certificate, WAF), the shared Artifact Registry repo `cloud-run-source-deploy`, the self-managed certificate
`cf-mmm-cert` (referenced as data), secret values, and billing budgets.

## Status: validate before you trust it
These files were authored in a sandbox that cannot start Terraform provider plugins, so `terraform validate` and
`plan` were **never run**. Do this first, in your own terminal:

```bash
cd infra
cp terraform.tfvars.example terraform.tfvars   # set notification_email
terraform init
terraform validate
terraform plan        # imports.tf adopts the existing resources; expect no destroys
```

Read the plan. Anything that wants to destroy or replace a resource is a mistake in this code, not in GCP: fix the
code (usually an attribute that differs from reality), never apply it. Cloud Run images, revision labels and the
Cloud Armor rules are deliberately ignored (`lifecycle.ignore_changes`): Cloud Build owns the image.
After the first clean apply you can delete `imports.tf`.

## Known intentional differences from what is deployed
1. **Frontend build args (bug fix, already applied by hand on 2026-11-25).** The frontend needs
   `VITE_MMM_API_BASE_URL` and `VITE_MMM_API_KEY` at build time, but the original `MMM-FRONTEND` trigger passed neither,
   so the live bundle had `baseURL ""` and an empty `x-api-key` (queries returned the SPA HTML). The trigger was patched
   with `gcloud beta builds triggers import` (base URL + the key from secret `mmm-fe-api-key`, a copy of the backend's
   `INTERNAL_API_KEY`), and the new bundle was verified. This code encodes the same configuration, so the plan should
   show no diff for the trigger or the `mmm-fe-api-key` secret.
2. `mmm-be-grove-api-key` (optional Grove LLM key) is new and gets created empty; `mmm-fe-api-key` already exists (import it: `projects/diana-438818/secrets/mmm-fe-api-key`).
3. The Cloud Armor attachment on `mmm-lb-svc` is not declared (the regional backend service resource has no argument for it); do not edit that resource without re-checking the attachment.
4. The failed managed certificate `mmm-cert` and the unused Cloud Armor policy
   `default-security-policy-for-backend-service-mmm-svc` are not adopted; delete them in the console if unused.

## Secrets
Terraform creates the secret containers and grants access; add values out of band:
`printf '%s' "$VALUE" | gcloud secrets versions add <name> --data-file=-` (see `docs/RUNBOOK.md` for rotation).

## Conventions (from the playground repo)
- Never write a plan file inside the repo; keep plans in `$TMPDIR`. `*.tfstate`, `*.tfplan`, `*.tfvars` are git-ignored.
- `terraform fmt -recursive` before committing; `plan` before every `apply`.
- State is local by default; switch to a GCS backend (commented in `versions.tf`) before sharing.
