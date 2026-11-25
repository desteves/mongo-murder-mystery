# Contributing

Contributions from people and from agents are welcome. Read [AGENTS.md](AGENTS.md) first: it has the code map, commands and rules.

## Setup
- Node 24 (LTS), npm, and Docker (only for the image smoke test). Copy `.env.example` files and fill in your own MongoDB
  connection strings; never commit them.
- Enable the secret guard once: `scripts/install-hooks.sh` (blocks `.env`, keys, connection strings with passwords).

## Before you open a pull request
```bash
cd app-backend && npm test
cd app-frontend/murdermystery && npm run lint && npm run build && npm run test:unit
node scripts/check-utm.mjs
scripts/smoke-images.sh        # if you touched a Dockerfile or dependencies
```
- Add or update tests with the change. Browser behavior gets a Playwright test in `app-frontend/murdermystery/e2e`.
- Links to mongodb.com need the standard UTM parameters: use `withUtm()` in the frontend (see AGENTS.md).
- Keep pull requests focused, and say what you verified and what you did not. Do not include credentials or Terraform state.

## Reporting problems
Bugs and ideas: open an issue. Security problems: see [SECURITY.md](SECURITY.md); do not open a public issue.

## Dependency updates
Dependabot opens one bundled pull request every Monday (`.github/dependabot.yml`). Every merge to `main` deploys to production,
so try it locally first (tests, lint, build, `scripts/smoke-images.sh`).
