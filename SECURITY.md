# Security policy

MongoDB Murder Mystery runs user-supplied queries against a read-only database and an AI agent that uses an MCP
server, so security reports are welcome.

## Reporting a vulnerability

Please report privately through GitHub's "Report a vulnerability" (Security tab -> Advisories) rather than a public
issue. Include what you did, what you expected, and what happened. Expect an acknowledgement within a few days.

## Scope

In scope: reading or changing the `solution` collection through `/eval` or `/agent`, bypassing query validation in
`helpers.js::validateQueryString`, making the agent call tools outside its allowlist (prompt injection), escaping the
read-only database user, bypassing the API key or rate limits, and secrets exposure.

Out of scope: volumetric denial of service, findings that need physical access, and issues in third-party services
(Atlas, Cloudflare, Google Cloud, OpenRouter) themselves.

## Design notes

`mmm` holds only the solution collection (update-only, reached through `/eval`); `mmm_AI` holds the game data and
agent memory (reached through `/agent` and the MCP server). The agent and MCP server have no access to `solution`.
Containers run as non-root, base images are pinned and patched at build time, and dependencies are reviewed weekly.
