import { z } from "zod";
import { 
  getCoordinates, 
  getCurrentWeather, 
  getForecast, 
  formatCurrentWeather, 
  formatForecast 
} from '../utils/weatherUtils.js';
import { getCacheEntry, setCacheEntry } from '../utils/cacheUtils.js';
import { createMcpWrapper } from '../helpers/mcpWrapper.js';

/**
 * Register weather-related tools with the server
 * @param {McpServer} server - MCP server instance
 */
export function registerWeatherTools(server) {
  const mcpWrapper = createMcpWrapper(server);

  // Define all tools with their schemas and handlers
  const weatherTools = [
    {
      name: "get_weather",
      schema: {
        city: z.string().describe("The city name to get weather for"),
      },
      handler: handleGetWeather,
      options: {
        description: "Get current weather conditions for a city"
      }
    },
    {
      name: "get_forecast",
      schema: {
        city: z.string().describe("The city name to get forecast for"),
        days: z.number().min(1).max(14).optional().describe("Number of days for forecast (default: 7, max: 14)")
      },
      handler: handleGetForecast,
      options: {
        description: "Get a multi-day weather forecast for a city"
      }
    },
    {
      name: "get_weather_by_coordinates",
      schema: {
        latitude: z.number().min(-90).max(90).describe("Latitude of the location (-90 to 90)"),
        longitude: z.number().min(-180).max(180).describe("Longitude of the location (-180 to 180)")
      },
      handler: handleGetWeatherByCoordinates,
      options: {
        description: "Get current weather conditions for specific latitude and longitude coordinates"
      }
    }
  ];

  // Register all tools at once
  mcpWrapper.registerTools(weatherTools);
}

/**
 * Handler for get_weather tool
 * @param {Object} params - Tool parameters
 * @returns {Object|string} Tool response
 */
async function handleGetWeather({ city }) {
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

/**
 * Handler for get_forecast tool
 * @param {Object} params - Tool parameters
 * @returns {Object|string} Tool response
 */
async function handleGetForecast({ city, days = 7 }) {
  // Check cache first
  const cacheKey = `${city.toLowerCase()}_${days}`;
  const cacheEntry = getCacheEntry('forecast', cacheKey);
  
  if (cacheEntry) {
    return cacheEntry.text;
  }
  
  // Get coordinates for the city
  const location = await getCoordinates(city);
  
  // Get forecast
  const forecast = await getForecast(location.latitude, location.longitude, days);
  
  // Format response
  const formattedResponse = formatForecast(forecast, location, days);
  
  // Cache the result
  setCacheEntry('forecast', cacheKey, formattedResponse);
  
  return formattedResponse;
}

/**
 * Handler for get_weather_by_coordinates tool
 * @param {Object} params - Tool parameters
 * @returns {Object|string} Tool response
 */
async function handleGetWeatherByCoordinates({ latitude, longitude }) {
  // Get current weather
  const weather = await getCurrentWeather(latitude, longitude);
  
  // Format response
  const locationInfo = { latitude, longitude };
  const formattedResponse = formatCurrentWeather(weather, locationInfo);
  
  return formattedResponse;
}
