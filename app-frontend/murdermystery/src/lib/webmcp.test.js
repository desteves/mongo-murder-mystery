import { test } from 'node:test'
import assert from 'node:assert/strict'
import { buildTools, registerWebMcpTools, GAME_GUIDE } from './webmcp.js'

const api = { executeQuery: async (q) => (decodeURIComponent(q).includes('boom') ? Promise.reject(Object.assign(new Error('x'), { userMessage: 'Missing collection name' })) : [{ _id: { $oid: '5f9f1b9f1b9f1b9f1b9f1b9f' }, isClue: true, a: 1 }]) }

test('tools have unique names, descriptions and object schemas', () => {
  const tools = buildTools({ api, go: () => {} })
  assert.equal(new Set(tools.map((t) => t.name)).size, tools.length)
  assert.ok(tools.length <= 40)
  for (const t of tools) {
    assert.match(t.name, /^[a-z][a-z0-9_]*$/)
    assert.ok(t.description.length > 20, `${t.name} needs a useful description`)
    assert.equal(t.inputSchema.type, 'object')
    assert.equal(typeof t.execute, 'function')
    for (const required of t.inputSchema.required ?? []) assert.ok(t.inputSchema.properties[required], `${t.name}: required ${required} is declared`)
  }
})

test('run_mongo_query returns EJSON text without the clue flag and explains errors', async () => {
  const run = buildTools({ api, go: () => {} }).find((t) => t.name === 'run_mongo_query')
  const out = await run.execute({ query: 'db.crime.find()' })
  assert.match(out, /ObjectId\("5f9f1b9f1b9f1b9f1b9f1b9f"\)/)
  assert.doesNotMatch(out, /isClue/)
  await assert.rejects(run.execute({ query: 'boom' }), /db\.<collection>/)
  await assert.rejects(run.execute({ query: '   ' }), /Provide a query/)
})

test('navigate_to_page navigates and rejects unknown pages', async () => {
  const seen = []
  const nav = buildTools({ api, go: (p) => seen.push(p) }).find((t) => t.name === 'navigate_to_page')
  assert.match(await nav.execute({ page: 'ai' }), /Opened ai/)
  assert.deepEqual(seen, ['/ai'])
  await assert.rejects(nav.execute({ page: 'nope' }), /Unknown page/)
})

test('get_game_guide is read only and describes the game', async () => {
  const guide = buildTools({ api, go: () => {} }).find((t) => t.name === 'get_game_guide')
  assert.equal(guide.annotations.readOnlyHint, true)
  assert.deepEqual(await guide.execute(), GAME_GUIDE)
})

test('registration is a no-op without WebMCP and registers every tool with it', () => {
  assert.equal(typeof registerWebMcpTools({ api, go: () => {} }, {}), 'function')
  const names = []
  const doc = { modelContext: { registerTool: async (t) => { names.push(t.name) } } }
  const unregister = registerWebMcpTools({ api, go: () => {} }, doc)
  assert.deepEqual(names.sort(), ['get_game_guide', 'navigate_to_page', 'run_mongo_query'])
  unregister()
})
