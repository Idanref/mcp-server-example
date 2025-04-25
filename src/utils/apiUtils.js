/**
 * Fetch and parse JSON from a URL
 * @param {string} url - URL to fetch from
 * @returns {Promise<Object>} Parsed JSON response
 * @throws {Error} If the fetch fails or the response is not OK
 */
export async function fetchJson(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    return await response.json();
  } catch (error) {
    process.stderr.write(`Error fetching data: ${error.message}\n`);
    throw error;
  }
}
