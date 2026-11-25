// The API answers in relaxed Extended JSON ({"$oid": "..."}, {"$date": "..."}). For people learning MongoDB the mongosh
// spelling is friendlier, so results are shown as ObjectId("..."), ISODate("...") and NumberLong("...").
const WRAPPERS = [
  [/\{\s*"\$oid"\s*:\s*("[0-9a-fA-F]{24}")\s*\}/g, 'ObjectId($1)'],
  [/\{\s*"\$date"\s*:\s*("[^"]*")\s*\}/g, 'ISODate($1)'],
  [/\{\s*"\$numberLong"\s*:\s*("-?\d+")\s*\}/g, 'NumberLong($1)'],
  [/\{\s*"\$numberDecimal"\s*:\s*("[^"]*")\s*\}/g, 'NumberDecimal($1)'],
]

/** Pretty-prints a query result with EJSON wrappers rewritten as mongosh type literals. */
export function formatResult(data) {
  let text = JSON.stringify(data, null, 2)
  if (text === undefined) return ''
  for (const [re, to] of WRAPPERS) text = text.replace(re, to)
  return text
}
