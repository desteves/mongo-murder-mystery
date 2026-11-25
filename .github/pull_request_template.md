## What changed and why

## How I verified it
- [ ] `npm test` in `app-backend`; `npm run lint && npm run build` in `app-frontend/murdermystery`
- [ ] Dockerfile or dependency change: ran `scripts/smoke-images.sh` (images build and answer their health checks)
- [ ] New startup requirement is in `dependencies`, not `devDependencies`
- [ ] No secrets committed (`scripts/install-hooks.sh` hook is on)
- [ ] Updated `CLAUDE.md` / docs if behavior or deployment changed

## What I did not verify
