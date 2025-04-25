import { McpServer, ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create the MCP server
const server = new McpServer({
  name: "Weather Information Server",
  version: "1.0.0"
});

// Cache for weather data to avoid excessive API calls
const weatherCache = {
  current: {},
  forecast: {},
  // Cache expiry time: 30 minutes
  cacheTime: 30 * 60 * 1000
};

// Utility function to fetch data from API
async function fetchJson(url) {
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

// Get coordinates for a city name using Open-Meteo geocoding API
async function getCoordinates(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`;
  const data = await fetchJson(url);
  
  if (!data.results || data.results.length === 0) {
    throw new Error(`City not found: ${city}`);
  }
  
  const location = data.results[0];
  return {
    latitude: location.latitude,
    longitude: location.longitude,
    name: location.name,
    country: location.country,
    admin1: location.admin1 // State/province
  };
}

// Get current weather for coordinates
async function getCurrentWeather(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m&temperature_unit=celsius`;
  
  const data = await fetchJson(url);
  return data.current;
}

// Get weather forecast for coordinates
async function getForecast(latitude, longitude, days = 7) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant&timezone=auto&forecast_days=${days}&temperature_unit=celsius`;
  
  const data = await fetchJson(url);
  return data.daily;
}

// Weather code to human-readable description mapping
function getWeatherDescription(code) {
  const weatherCodes = {
    0: "Clear sky",
    1: "Mainly clear",
    2: "Partly cloudy",
    3: "Overcast",
    45: "Fog",
    48: "Depositing rime fog",
    51: "Light drizzle",
    53: "Moderate drizzle",
    55: "Dense drizzle",
    56: "Light freezing drizzle",
    57: "Dense freezing drizzle",
    61: "Slight rain",
    63: "Moderate rain",
    65: "Heavy rain",
    66: "Light freezing rain",
    67: "Heavy freezing rain",
    71: "Slight snow fall",
    73: "Moderate snow fall",
    75: "Heavy snow fall",
    77: "Snow grains",
    80: "Slight rain showers",
    81: "Moderate rain showers",
    82: "Violent rain showers",
    85: "Slight snow showers",
    86: "Heavy snow showers",
    95: "Thunderstorm",
    96: "Thunderstorm with slight hail",
    99: "Thunderstorm with heavy hail"
  };
  
  return weatherCodes[code] || `Unknown (code: ${code})`;
}

// Format wind direction as cardinal direction
function formatWindDirection(degrees) {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

// Add resource for current weather by city
server.resource(
  "currentweather",
  new ResourceTemplate("currentweather://{city}", {
    list: async () => ({
      items: [
        { uri: "currentweather://London" },
        { uri: "currentweather://New York" },
        { uri: "currentweather://Tokyo" },
        { uri: "currentweather://Paris" },
        { uri: "currentweather://Sydney" }
      ]
    })
  }),
  async (uri, { city }) => {
    try {
      // Check cache first
      const cacheKey = city.toLowerCase();
      const now = Date.now();
      if (weatherCache.current[cacheKey] && 
          now - weatherCache.current[cacheKey].timestamp < weatherCache.cacheTime) {
        return { 
          contents: [{ 
            uri: uri.href, 
            text: weatherCache.current[cacheKey].text 
          }] 
        };
      }
      
      // Get coordinates for the city
      const location = await getCoordinates(city);
      
      // Get current weather
      const weather = await getCurrentWeather(location.latitude, location.longitude);
      
      // Format response
      const weatherDesc = getWeatherDescription(weather.weather_code);
      const windDirection = formatWindDirection(weather.wind_direction_10m);
      
      const formattedResponse = `
# Current Weather for ${location.name}, ${location.country}

**Conditions:** ${weatherDesc}
**Temperature:** ${weather.temperature_2m}°C (Feels like: ${weather.apparent_temperature}°C)
**Humidity:** ${weather.relative_humidity_2m}%
**Wind:** ${weather.wind_speed_10m} km/h ${windDirection}${weather.wind_gusts_10m > weather.wind_speed_10m * 1.5 ? ` with gusts up to ${weather.wind_gusts_10m} km/h` : ''}
**Cloud Cover:** ${weather.cloud_cover}%
**Precipitation:** ${weather.precipitation} mm${weather.rain > 0 ? ` (Rain: ${weather.rain} mm)` : ''}

*Updated: ${new Date().toLocaleString()}*
      `;
      
      // Cache the result
      weatherCache.current[cacheKey] = {
        timestamp: now,
        text: formattedResponse
      };
      
      return { 
        contents: [{ 
          uri: uri.href, 
          text: formattedResponse 
        }] 
      };
    } catch (error) {
      return { 
        contents: [{ 
          uri: uri.href, 
          text: `Error retrieving weather: ${error.message}` 
        }] 
      };
    }
  }
);

// Tool to get current weather by city name
server.tool(
  "get_weather",
  {
    city: z.string().describe("The city name to get weather for"),
  },
  async ({ city }) => {
    try {
      // Check cache first
      const cacheKey = city.toLowerCase();
      const now = Date.now();
      if (weatherCache.current[cacheKey] && 
          now - weatherCache.current[cacheKey].timestamp < weatherCache.cacheTime) {
        return {
          content: [{
            type: "text",
            text: weatherCache.current[cacheKey].text
          }]
        };
      }
      
      // Get coordinates for the city
      const location = await getCoordinates(city);
      
      // Get current weather
      const weather = await getCurrentWeather(location.latitude, location.longitude);
      
      // Format response
      const weatherDesc = getWeatherDescription(weather.weather_code);
      const windDirection = formatWindDirection(weather.wind_direction_10m);
      
      const formattedResponse = `
# Current Weather for ${location.name}, ${location.country}

**Conditions:** ${weatherDesc}
**Temperature:** ${weather.temperature_2m}°C (Feels like: ${weather.apparent_temperature}°C)
**Humidity:** ${weather.relative_humidity_2m}%
**Wind:** ${weather.wind_speed_10m} km/h ${windDirection}${weather.wind_gusts_10m > weather.wind_speed_10m * 1.5 ? ` with gusts up to ${weather.wind_gusts_10m} km/h` : ''}
**Cloud Cover:** ${weather.cloud_cover}%
**Precipitation:** ${weather.precipitation} mm${weather.rain > 0 ? ` (Rain: ${weather.rain} mm)` : ''}

*Updated: ${new Date().toLocaleString()}*
      `;
      
      // Cache the result
      weatherCache.current[cacheKey] = {
        timestamp: now,
        text: formattedResponse
      };
      
      return {
        content: [{
          type: "text",
          text: formattedResponse
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving weather: ${error.message}`
        }]
      };
    }
  },
  {
    description: "Get current weather conditions for a city"
  }
);

// Tool to get weather forecast by city name
server.tool(
  "get_forecast",
  {
    city: z.string().describe("The city name to get forecast for"),
    days: z.number().min(1).max(14).optional().describe("Number of days for forecast (default: 7, max: 14)")
  },
  async ({ city, days = 7 }) => {
    try {
      // Check cache first
      const cacheKey = `${city.toLowerCase()}_${days}`;
      const now = Date.now();
      if (weatherCache.forecast[cacheKey] && 
          now - weatherCache.forecast[cacheKey].timestamp < weatherCache.cacheTime) {
        return {
          content: [{
            type: "text",
            text: weatherCache.forecast[cacheKey].text
          }]
        };
      }
      
      // Get coordinates for the city
      const location = await getCoordinates(city);
      
      // Get forecast
      const forecast = await getForecast(location.latitude, location.longitude, days);
      
      // Format response
      let formattedResponse = `# ${days}-Day Weather Forecast for ${location.name}, ${location.country}\n\n`;
      
      for (let i = 0; i < forecast.time.length; i++) {
        const date = new Date(forecast.time[i]);
        const dayName = date.toLocaleDateString(undefined, { weekday: 'long' });
        const dateStr = date.toLocaleDateString();
        const weatherDesc = getWeatherDescription(forecast.weather_code[i]);
        const windDirection = formatWindDirection(forecast.wind_direction_10m_dominant[i]);
        
        formattedResponse += `## ${dayName}, ${dateStr}\n`;
        formattedResponse += `**Conditions:** ${weatherDesc}\n`;
        formattedResponse += `**Temperature:** ${forecast.temperature_2m_min[i]}°C to ${forecast.temperature_2m_max[i]}°C\n`;
        formattedResponse += `**Precipitation:** ${forecast.precipitation_sum[i]} mm over ${forecast.precipitation_hours[i]} hours\n`;
        formattedResponse += `**Wind:** ${forecast.wind_speed_10m_max[i]} km/h ${windDirection}`;
        
        if (forecast.wind_gusts_10m_max[i] > forecast.wind_speed_10m_max[i] * 1.3) {
          formattedResponse += ` with gusts up to ${forecast.wind_gusts_10m_max[i]} km/h`;
        }
        
        formattedResponse += '\n\n';
      }
      
      formattedResponse += `*Updated: ${new Date().toLocaleString()}*`;
      
      // Cache the result
      weatherCache.forecast[cacheKey] = {
        timestamp: now,
        text: formattedResponse
      };
      
      return {
        content: [{
          type: "text",
          text: formattedResponse
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving forecast: ${error.message}`
        }]
      };
    }
  },
  {
    description: "Get a multi-day weather forecast for a city"
  }
);

// Tool to get weather by coordinates
server.tool(
  "get_weather_by_coordinates",
  {
    latitude: z.number().min(-90).max(90).describe("Latitude of the location (-90 to 90)"),
    longitude: z.number().min(-180).max(180).describe("Longitude of the location (-180 to 180)")
  },
  async ({ latitude, longitude }) => {
    try {
      // Get current weather
      const weather = await getCurrentWeather(latitude, longitude);
      
      // Format response
      const weatherDesc = getWeatherDescription(weather.weather_code);
      const windDirection = formatWindDirection(weather.wind_direction_10m);
      
      const formattedResponse = `
# Current Weather for Coordinates (${latitude.toFixed(4)}, ${longitude.toFixed(4)})

**Conditions:** ${weatherDesc}
**Temperature:** ${weather.temperature_2m}°C (Feels like: ${weather.apparent_temperature}°C)
**Humidity:** ${weather.relative_humidity_2m}%
**Wind:** ${weather.wind_speed_10m} km/h ${windDirection}${weather.wind_gusts_10m > weather.wind_speed_10m * 1.5 ? ` with gusts up to ${weather.wind_gusts_10m} km/h` : ''}
**Cloud Cover:** ${weather.cloud_cover}%
**Precipitation:** ${weather.precipitation} mm${weather.rain > 0 ? ` (Rain: ${weather.rain} mm)` : ''}

*Updated: ${new Date().toLocaleString()}*
      `;
      
      return {
        content: [{
          type: "text",
          text: formattedResponse
        }]
      };
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error retrieving weather: ${error.message}`
        }]
      };
    }
  },
  {
    description: "Get current weather conditions for specific latitude and longitude coordinates"
  }
);

// Start the server with stdio transport
const transport = new StdioServerTransport();
server.connect(transport)
  .then(() => process.stderr.write("Weather MCP Server started\n"))
  .catch(err => process.stderr.write(`Failed to start server: ${err}\n`));