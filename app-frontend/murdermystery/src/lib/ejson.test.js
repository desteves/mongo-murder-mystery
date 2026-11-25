import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatResult } from './ejson.js'
import { explainError, preflightHint, straightenQuotes } from './errors.js'
import { toShell } from './shell.js'
import { loadClues, recordClue, clearClues, clueMessage } from './clues.js'

const memory = () => {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) }
}

test('formatResult shows mongosh type literals for EJSON wrappers', () => {
  const out = formatResult([{ _id: { $oid: '5f9f1b9f1b9f1b9f1b9f1b9f' }, at: { $date: '2018-01-15T00:00:00Z' }, n: { $numberLong: '7' }, name: 'x' }])
  assert.match(out, /"_id": ObjectId\("5f9f1b9f1b9f1b9f1b9f1b9f"\)/)
  assert.match(out, /"at": ISODate\("2018-01-15T00:00:00Z"\)/)
  assert.match(out, /"n": NumberLong\("7"\)/)
  assert.match(out, /"name": "x"/)
})

test('explainError maps known messages to a hint and falls back gracefully', () => {
  assert.match(explainError('Missing collection name').hint, /getCollectionNames/)
  assert.match(explainError('Not allowed. This is a restricted collection').hint, /db\.solution\.find/)
  assert.match(explainError('Error parsing filter: Unexpected token').hint, /quotes/)
  assert.equal(explainError('weird').summary, 'weird')
})

test('preflightHint catches common mistakes only', () => {
  assert.match(preflightHint(''), /Type a query/)
  assert.match(preflightHint('crime.find()'), /start with db/)
  assert.match(preflightHint('db.crime.find({ "a": 1 )'), /unbalanced/)
  assert.match(preflightHint('db.crime.find({ "a: 1 })'), /double quotes/)
  assert.equal(preflightHint('db.crime.find({ "a": 1 })'), null)
})

test('straightenQuotes replaces curly quotes', () => {
  assert.equal(straightenQuotes('db.a.find({ “x”: ‘y’ })'), 'db.a.find({ "x": \'y\' })')
})

test('toShell renders agent tool calls', () => {
  assert.equal(toShell({ tool: 'find', collection: 'person', filter: { name: 'A' }, limit: 3 }), 'db.person.find({"name":"A"}).limit(3)')
  assert.equal(toShell({ tool: 'count', collection: 'person', filter: {} }), 'db.person.countDocuments({})')
  assert.equal(toShell({ tool: 'aggregate', collection: 'crime', pipeline: [{ $limit: 1 }] }), 'db.crime.aggregate([{"$limit":1}])')
  assert.equal(toShell({ tool: 'list-collections' }), 'db.getCollectionNames()')
})

test('clues are remembered and capped', () => {
  const s = memory()
  assert.deepEqual(loadClues(s), { crime: false, person: 0 })
  recordClue('crime', s)
  for (let i = 0; i < 5; i += 1) recordClue('person', s)
  assert.deepEqual(loadClues(s), { crime: true, person: 3 })
  clearClues(s)
  assert.deepEqual(loadClues(s), { crime: false, person: 0 })
  assert.match(clueMessage(true).title, /crime scene/)
  assert.match(clueMessage(1).title, /key person/)
})
