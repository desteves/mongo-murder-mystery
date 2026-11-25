# Agent readiness (Lighthouse "Agentic browsing")

Chrome's experimental Lighthouse category (Chrome 150+; WebMCP audits need the WebMCP origin trial) checks how well a site works
for AI agents. Source: https://developer.chrome.com/docs/lighthouse/agentic-browsing/scoring . It is not a 0-100 score: it reports
a pass ratio plus errors and warnings.

| Audit | What it checks | Status here |
|---|---|---|
| Registered WebMCP tools | Tools registered declaratively or imperatively (warns above 40) | 3 imperative tools (`run_mongo_query`, `get_game_guide`, `navigate_to_page`, in `src/lib/webmcp.js`) + 1 declarative form (`ask_detective_agent` in `AgentPrompt.vue`) |
| WebMCP schema validity | Forms with `toolname` and `tooldescription` together; every field has a `name`; optional fields have `toolparamdescription` or a `<label>` | The only form has both attributes, a named `question` field, a `<label>` and `toolparamdescription` |
| Forms missing declarative WebMCP | Informational: `<form>` elements without the attributes | The site has one form, and it is declared |
| Accessibility for agents | Names and labels, valid roles, nothing interactive hidden from the a11y tree | Icon buttons named (`SelfTimer`), notes textarea labelled, CodeMirror has an `aria-label`, zoomable images are keyboard operable, one `<h1>` per page, skip link and landmarks |
| Layout stability (CLS) | Cumulative Layout Shift | Hero image has width/height and a preload; schema images have dimensions; the editor shows a same-size placeholder until CodeMirror loads |
| llms.txt | Presence of `/llms.txt` (404 is N/A; a server error is flagged) | `public/llms.txt` served as `text/plain` |
| ard.json | Agentic Resource Discovery manifest | Not provided: the site has no public MCP server, A2A agent or skill to catalog (the MCP server is private by design) |

## Tools exposed to agents
- `run_mongo_query(query)`: the same read-only query as the query box (same server validation, allowlist and rate limit). Output is
  flagged `untrustedContentHint` because documents contain free text.
- `get_game_guide()`: read-only description of the game, collections, supported query forms and limits.
- `navigate_to_page(page)`: home, walkthrough, ai or about.
- `ask_detective_agent` (declarative form): plain-English question to the site's own AI assistant. An agent-invoked submit returns the answer
  through `event.respondWith`.

WebMCP is experimental and the API may change. Registration is feature-detected (`document.modelContext.registerTool`) and a no-op in
other browsers. If the spec changes, only `src/lib/webmcp.js` and the form attributes need updating.

## Keeping it working
- Unit tests: `npm run test:unit` (tool shapes and behavior). e2e: `e2e/agentic.spec.js` (needs Playwright).
- Run the audit in Chrome 150+ with the origin trial enabled (DevTools Lighthouse, category "Agentic browsing"). Results fluctuate with
  dynamic tool registration timing and a11y tree size, so compare trends, not single runs.
- New interactive elements need an accessible name; new forms need `toolname`, `tooldescription`, field `name`s and `toolparamdescription`.
