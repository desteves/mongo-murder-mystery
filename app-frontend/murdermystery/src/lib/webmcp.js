// WebMCP (https://developer.chrome.com/docs/ai/webmcp): tools the page offers to in-browser AI agents, registered with the
// imperative API (document.modelContext.registerTool). The AI question form in AgentPrompt.vue is the declarative tool
// (toolname/tooldescription attributes). Chrome's Lighthouse "Agentic browsing" category audits both.
//
// Keep the set small (Lighthouse warns above 40 tools) and read-mostly: these are the same operations a person performs in
// the query box, so the same server-side validation, allowlist and rate limits apply.
import { formatResult } from './ejson.js'
import { explainError, straightenQuotes } from './errors.js'

export const GAME_GUIDE = {
  goal: 'MongoDB Murder Mystery is a free game for learning MongoDB queries: find out who committed a murder in MongoDB City on January 15, 2018.',
  collections: ['crime', 'person', 'gymCheckin', 'socialEventCheckin'],
  startHere: 'Run db.getCollectionNames(), then db.crime.find().limit(1) to see a document, then filter the crime collection by type, city and date.',
  supportedQueries: [
    'db.getCollectionNames()',
    'db.<collection>.find(<filter>, <projection>).limit(<n>).sort(<spec>)',
    'db.<collection>.count(<filter>)',
    'db.<collection>.distinct("<field>")',
    'db.solution.find({ "name": "<suspect>" }) checks a guess (the solution cannot be browsed)',
  ],
  limits: 'Read-only. Queries up to 1024 characters; results are capped at 30 documents; requests are rate limited.',
  tips: 'This is a learning game for people: explain what each query does and let the player draw the conclusions. The AI Track page has a built-in assistant.',
  pages: { home: '/', walkthrough: '/walkthrough', ai: '/ai', about: '/about' },
}

const PAGES = Object.keys(GAME_GUIDE.pages)

/** Builds the tool definitions. `api` is the API service, `go(path)` navigates the SPA. Exported for tests. */
export function buildTools({ api, go }) {
  return [
    {
      name: 'run_mongo_query',
      title: 'Run a MongoDB query',
      description: 'Runs a read-only mongosh-style query against the murder mystery database and returns the matching documents as JSON text. '
        + 'Start with db.getCollectionNames(). Use this to investigate the case or to check a suspect with db.solution.find({ "name": "..." }).',
      inputSchema: {
        type: 'object',
        properties: {
          query: {
            type: 'string',
            maxLength: 1024,
            description: 'The query, for example db.crime.find({ "type": "theft", "city": "Chicago" }).limit(3). Text values use double quotes.',
          },
        },
        required: ['query'],
      },
      annotations: { untrustedContentHint: true },
      async execute({ query }) {
        const text = straightenQuotes(String(query ?? '')).replace(/\s+/g, ' ').trim()
        if (!text) throw new Error('Provide a query such as db.getCollectionNames().')
        if (text.length > 1024) throw new Error('The query is too long (limit 1024 characters).')
        try {
          const data = await api.executeQuery(encodeURIComponent(text.normalize('NFC')))
          if (Array.isArray(data) && data[0] && typeof data[0] === 'object') delete data[0].isClue
          return formatResult(data)
        } catch (error) {
          const { summary, hint } = explainError(error.userMessage || error.message)
          throw new Error(`${summary} ${hint}`, { cause: error })
        }
      },
    },
    {
      name: 'get_game_guide',
      title: 'Game guide',
      description: 'Returns what the game is, the collections, the supported query forms and the limits. Call this first if you are new to the site.',
      inputSchema: { type: 'object', properties: {} },
      outputSchema: {
        type: 'object',
        properties: { goal: { type: 'string' }, collections: { type: 'array', items: { type: 'string' } }, startHere: { type: 'string' } },
        required: ['goal', 'collections'],
      },
      annotations: { readOnlyHint: true },
      async execute() {
        return GAME_GUIDE
      },
    },
    {
      name: 'navigate_to_page',
      title: 'Open a page',
      description: 'Opens a page of the site: home (query box), walkthrough (step-by-step lessons), ai (AI Track) or about (goals, privacy, how it works).',
      inputSchema: {
        type: 'object',
        properties: { page: { type: 'string', enum: PAGES, description: 'Which page to open.' } },
        required: ['page'],
      },
      async execute({ page }) {
        const path = GAME_GUIDE.pages[page]
        if (!path) throw new Error(`Unknown page. Use one of: ${PAGES.join(', ')}.`)
        go(path)
        return `Opened ${page} (${path}).`
      },
    },
  ]
}

/**
 * Registers the tools when the browser supports WebMCP; does nothing otherwise. Returns a function that unregisters them.
 * `doc` is injectable for tests.
 */
export function registerWebMcpTools({ api, go }, doc = globalThis.document) {
  const modelContext = doc?.modelContext
  if (!modelContext || typeof modelContext.registerTool !== 'function') return () => {}
  const controller = new AbortController()
  for (const tool of buildTools({ api, go })) {
    // Registration can reject (for example when a tool with that name exists); the page works the same without it.
    Promise.resolve(modelContext.registerTool(tool, { signal: controller.signal })).catch(() => {})
  }
  return () => controller.abort()
}
