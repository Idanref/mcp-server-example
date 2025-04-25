// Cache for weather data to avoid excessive API calls
const weatherCache = {
  current: {},
  forecast: {},
  // Cache expiry time: 30 minutes
  cacheTime: 30 * 60 * 1000
};

/**
 * Get cache entry if valid
 * @param {string} type - Cache type (current or forecast)
 * @param {string} key - Cache key
 * @returns {Object|null} Cache entry if valid, null otherwise
 */
export function getCacheEntry(type, key) {
  if (!weatherCache[type][key]) return null;
  
  const now = Date.now();
  if (now - weatherCache[type][key].timestamp < weatherCache.cacheTime) {
    return weatherCache[type][key];
  }
  return null;
}

/**
 * Set cache entry
 * @param {string} type - Cache type (current or forecast)
 * @param {string} key - Cache key
 * @param {string} text - Content to cache
 */
export function setCacheEntry(type, key, text) {
  weatherCache[type][key] = {
    timestamp: Date.now(),
    text: text
  };
}
