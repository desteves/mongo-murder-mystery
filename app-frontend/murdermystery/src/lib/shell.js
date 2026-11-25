// Renders a structured tool call made by the AI agent as the mongosh command a person would type, so each answer shows
// how plain English became a query.
const json = (v) => JSON.stringify(v ?? {})

/** call: { tool, collection, filter, projection, limit, pipeline } */
export function toShell(call) {
  const c = call?.collection ? `db.${call.collection}` : 'db'
  switch (call?.tool) {
    case 'find': {
      const args = call.projection && Object.keys(call.projection).length ? `${json(call.filter)}, ${json(call.projection)}` : json(call.filter)
      return `${c}.find(${args})${call.limit ? `.limit(${call.limit})` : ''}`
    }
    case 'count':
      return `${c}.countDocuments(${json(call.filter)})`
    case 'aggregate':
      return `${c}.aggregate(${JSON.stringify(call.pipeline ?? [])})`
    case 'list-collections':
      return 'db.getCollectionNames()'
    case 'list-databases':
      return 'show dbs'
    default:
      return `// ${call?.tool ?? 'unknown tool'}`
  }
}
