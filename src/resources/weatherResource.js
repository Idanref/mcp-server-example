import { getCoordinates, getCurrentWeather, formatCurrentWeather } from '../utils/weatherUtils.js';
import { getCacheEntry, setCacheEntry } from '../utils/cacheUtils.js';
import { createMcpWrapper } from '../helpers/mcpWrapper.js';
import { createResourceTemplate } from '../helpers/resourceHelper.js';

/**
 * Register weather-related resources with the server
 * @param {McpServer} server - MCP server instance
 */
export function registerWeatherResources(server) {
  const mcpWrapper = createMcpWrapper(server);
  
  // Create resource template
  const currentWeatherTemplate = createResourceTemplate("currentweather://{city}", {
    list: async () => ({
      items: [
        { uri: "currentweather://London" },
        { uri: "currentweather://New York" },
        { uri: "currentweather://Tokyo" },
        { uri: "currentweather://Paris" },
        { uri: "currentweather://Sydney" }
      ]
    })
  });
  
  // Define resources with their templates and handlers
  const weatherResources = [
    {
      name: "currentweather",
      template: currentWeatherTemplate,
      handler: handleCurrentWeather
    }
  ];
  
  // Register all resources at once
  mcpWrapper.registerResources(weatherResources);
}

/**
 * Handler for currentweather resource
 * @param {URL} uri - Resource URI
 * @param {Object} params - Resource parameters
 * @returns {Object|string} Resource response
 */
async function handleCurrentWeather(uri, { city }) {
  // Check cache first
  const cacheKey = city.toLowerCase();
  const cacheEntry = getCacheEntry('current', cacheKey);
  
  if (cacheEntry) {
    return cacheEntry.text;
  }
  
  // Get coordinates for the city
  const location = await getCoordinates(city);
  
  // Get current weather
  const weather = await getCurrentWeather(location.latitude, location.longitude);
  
  // Format response
  const formattedResponse = formatCurrentWeather(weather, location);
  
  // Cache the result
  setCacheEntry('current', cacheKey, formattedResponse);
  
  return formattedResponse;
}
