// Turns the API's terse errors into a short explanation plus a concrete next step. Matching is by message text because the
// API returns { err: "..." } strings. The first matching rule wins.
const RULES = [
  [/Missing collection name/i, 'Queries start with db.<collection>.', 'Try db.getCollectionNames() to list the collections, then db.crime.find().limit(1).'],
  [/Unsupported query/i, 'That command is not supported here.', 'You can use find(), count(), distinct(), limit(), sort() and db.getCollectionNames().'],
  [/restricted collection/i, 'The solution collection can only be checked, not browsed.', 'Use exactly: db.solution.find({ "name": "Suspect Name" }) with your guess.'],
  [/Operator \$\w+ is not allowed|BSON type \w+ is not allowed/i, 'That operator is blocked for safety.', 'Stick to filters like $gt, $lt, $in and regular expressions.'],
  [/Error parsing filter|Invalid find arguments|Invalid input format|Invalid (count|sort) filter/i, 'The filter could not be read.', 'Check that braces and quotes are balanced, text values use double quotes ("..."), and numbers have no quotes.'],
  [/Limit needs to be a number/i, 'limit() needs a number.', 'For example .limit(5). Results are capped at 30 documents.'],
  [/Distinct field missing/i, 'distinct() needs a field name.', 'For example db.crime.distinct("type").'],
  [/Too many requests|429/i, 'You are going a little fast.', 'Wait about a minute and try again.'],
  [/Cannot validate|Query (is|must)/i, 'The query could not be read.', 'Make sure it is plain text, under 1000 characters, and starts with db.'],
  [/Cannot run|Database connection failed|Server error|temporarily unavailable/i, 'Something went wrong on our side.', 'Try again in a moment; your query is fine.'],
]

export function explainError(message) {
  const text = String(message ?? '')
  for (const [re, summary, hint] of RULES) {
    if (re.test(text)) return { summary, hint }
  }
  return { summary: text || 'Something went wrong.', hint: 'Check the query syntax and try again, or click RESET to start over.' }
}

/** Cheap checks on the query text before sending it. Returns a hint, or null when nothing looks wrong. */
export function preflightHint(query) {
  const q = String(query ?? '').trim()
  if (!q) return 'Type a query first, for example db.getCollectionNames().'
  if (!/^db(\.|\[)/.test(q)) return 'Queries start with db. for example db.crime.find().limit(1).'
  const open = (q.match(/[({[]/g) || []).length
  const close = (q.match(/[)}\]]/g) || []).length
  if (open !== close) return 'The brackets look unbalanced: every ( { [ needs a matching ) } ].'
  if ((q.match(/"/g) || []).length % 2 === 1) return 'There is an odd number of double quotes: close every "text".'
  return null
}

/** Curly quotes (pasted from docs or chat apps) are not valid in queries: replace them with straight quotes. */
export function straightenQuotes(text) {
  return String(text).replace(/[“”„‟]/g, '"').replace(/[‘’‚‛]/g, "'")
}
