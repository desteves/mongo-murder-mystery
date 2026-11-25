// The UTM parameters on every link back to mongodb.com (any subdomain), in this order. Same set as the
// mongodb-playground project. Never hand-write them in components: wrap the URL in withUtm().
// (Static docs carry the literal query string; scripts/check-utm.mjs enforces both.)
export const UTM_KEYS = ['utm_campaign', 'utm_source', 'utm_medium', 'utm_content', 'utm_term']

export const UTM_DEFAULT = {
  utm_campaign: 'devrel',
  utm_source: 'third-party-content',
  utm_medium: 'cta',
  utm_content: 'mongodb-playground',
  utm_term: 'diana.esteves',
}

/** Adds the UTM parameters to a link to mongodb.com (`mongodb.com` or any `*.mongodb.com`).
 *  Other links come back unchanged; other query parameters and the fragment are kept. */
export function withUtm(href, utm = UTM_DEFAULT) {
  let url
  try {
    url = new URL(href)
  } catch {
    return href
  }
  const host = url.hostname.toLowerCase()
  if (host !== 'mongodb.com' && !host.endsWith('.mongodb.com')) return href
  for (const k of UTM_KEYS) url.searchParams.delete(k)
  for (const k of UTM_KEYS) url.searchParams.set(k, utm[k] ?? UTM_DEFAULT[k])
  return url.toString()
}
