// Remembers which clues the player has found (in this browser only). The API flags a crime-scene match with isClue: true
// and a witness/suspect match with isClue: 1.
const KEY = 'mmm-clues'
export const CLUE_EVENT = 'mmm-clues-changed'

export const CLUE_LABELS = {
  crime: 'Crime scene report',
  person: 'Person of interest',
}

function read(storage) {
  try {
    return JSON.parse(storage.getItem(KEY) || '{}')
  } catch {
    return {}
  }
}

export function loadClues(storage = globalThis.localStorage) {
  const c = read(storage)
  return { crime: Boolean(c.crime), person: Number(c.person) || 0 }
}

/** kind: 'crime' | 'person'. Person clues are counted (witnesses and the suspect). Returns the updated state. */
export function recordClue(kind, storage = globalThis.localStorage) {
  const c = loadClues(storage)
  if (kind === 'crime') c.crime = true
  if (kind === 'person') c.person = Math.min(c.person + 1, 3)
  try {
    storage.setItem(KEY, JSON.stringify(c))
    globalThis.dispatchEvent?.(new Event(CLUE_EVENT))
  } catch { /* storage full or blocked: clues are a convenience */ }
  return c
}

export function clearClues(storage = globalThis.localStorage) {
  try {
    storage.removeItem(KEY)
    globalThis.dispatchEvent?.(new Event(CLUE_EVENT))
  } catch { /* ignore */ }
}

/** The message shown when a clue is matched, with a concrete next step (no spoilers). */
export function clueMessage(isClue) {
  if (isClue === true) {
    return {
      title: 'Clue found: the crime scene report',
      next: 'Read it closely. It points to two witnesses. Next, find them in the person collection using the details from the report.',
    }
  }
  return {
    title: 'Clue found: a key person',
    next: 'Read their interview, then use what it says to look in the other collections. The schema diagram shows how they connect.',
  }
}
