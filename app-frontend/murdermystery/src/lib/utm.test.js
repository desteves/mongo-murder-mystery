import { test } from 'node:test'
import assert from 'node:assert/strict'
import { withUtm, UTM_KEYS } from './utm.js'

const EXPECTED = 'utm_campaign=devrel&utm_source=third-party-content&utm_medium=cta&utm_content=mmm&utm_term=diana.esteves'

test('adds the full UTM set, in order, to any mongodb.com host', () => {
  for (const host of ['www.mongodb.com', 'learn.mongodb.com', 'cloud.mongodb.com', 'docs.mongodb.com', 'mongodb.com']) {
    assert.equal(withUtm(`https://${host}/x`), `https://${host}/x?${EXPECTED}`)
  }
})

test('replaces old UTM values, keeps other params and the fragment', () => {
  const out = withUtm('https://learn.mongodb.com/a?foo=1&utm_source=old&utm_content=old#frag')
  const url = new URL(out)
  assert.equal(url.searchParams.get('foo'), '1')
  assert.equal(url.searchParams.get('utm_source'), 'third-party-content')
  assert.equal(url.searchParams.get('utm_content'), 'mmm')
  assert.equal(url.hash, '#frag')
  assert.deepEqual(UTM_KEYS.filter((k) => url.searchParams.has(k)), UTM_KEYS)
})

test('leaves other links alone', () => {
  assert.equal(withUtm('https://mongomurdermystery.com/about'), 'https://mongomurdermystery.com/about')
  assert.equal(withUtm('https://notmongodb.com/x'), 'https://notmongodb.com/x')
  assert.equal(withUtm('not a url'), 'not a url')
})
