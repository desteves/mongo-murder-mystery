/**
 * Composable for managing query result caching
 * Implements LRU (Least Recently Used) cache with configurable size
 *
 * @param {number} maxSize - Maximum number of cached queries (default: 50)
 * @returns {Object} Cache management functions
 */
export function useQueryCache(maxSize = 50) {
  // Using Map for better performance than Object
  const cache = new Map()

  /**
   * Get cached result for a query
   * @param {string} key - Query key
   * @returns {any} Cached result or undefined
   */
  const get = (key) => {
    const value = cache.get(key)
    if (value) {
      // Move to end (most recently used)
      cache.delete(key)
      cache.set(key, value)
    }
    return value
  }

  /**
   * Set cached result for a query
   * Implements LRU eviction when cache is full
   * @param {string} key - Query key
   * @param {any} value - Result to cache
   */
  const set = (key, value) => {
    // Remove if exists (to reinsert at end)
    if (cache.has(key)) {
      cache.delete(key)
    }

    // Evict oldest entry if at capacity
    if (cache.size >= maxSize) {
      const firstKey = cache.keys().next().value
      cache.delete(firstKey)
    }

    cache.set(key, value)
  }

  /**
   * Check if query result is cached
   * @param {string} key - Query key
   * @returns {boolean}
   */
  const has = (key) => cache.has(key)

  /**
   * Clear all cached results
   */
  const clear = () => cache.clear()

  /**
   * Get current cache size
   * @returns {number}
   */
  const size = () => cache.size

  /**
   * Remove specific cached result
   * @param {string} key - Query key
   * @returns {boolean} true if deleted
   */
  const remove = (key) => cache.delete(key)

  return {
    get,
    set,
    has,
    clear,
    size,
    remove
  }
}
