import { fetchJson } from './apiUtils.js';

/**
 * Get coordinates for a city name using Open-Meteo geocoding API
 * @param {string} city - City name to get coordinates for
 * @returns {Promise<Object>} Location data with coordinates
 */
export async function getCoordinates(city) {
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

/**
 * Get current weather for coordinates
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @returns {Promise<Object>} Current weather data
 */
export async function getCurrentWeather(latitude, longitude) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,rain,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,wind_gusts_10m&temperature_unit=celsius`;
  
  const data = await fetchJson(url);
  return data.current;
}

/**
 * Get weather forecast for coordinates
 * @param {number} latitude - Latitude
 * @param {number} longitude - Longitude
 * @param {number} days - Number of days for forecast
 * @returns {Promise<Object>} Forecast data
 */
export async function getForecast(latitude, longitude, days = 7) {
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_hours,wind_speed_10m_max,wind_gusts_10m_max,wind_direction_10m_dominant&timezone=auto&forecast_days=${days}&temperature_unit=celsius`;
  
  const data = await fetchJson(url);
  return data.daily;
}

/**
 * Get human-readable weather description from code
 * @param {number} code - Weather code
 * @returns {string} Human-readable description
 */
export function getWeatherDescription(code) {
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

/**
 * Format wind direction as cardinal direction
 * @param {number} degrees - Wind direction in degrees
 * @returns {string} Cardinal direction
 */
export function formatWindDirection(degrees) {
  const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
  const index = Math.round(degrees / 22.5) % 16;
  return directions[index];
}

/**
 * Format current weather data as a markdown string
 * @param {Object} weather - Weather data
 * @param {Object} location - Location data
 * @returns {string} Formatted markdown
 */
export function formatCurrentWeather(weather, location) {
  const weatherDesc = getWeatherDescription(weather.weather_code);
  const windDirection = formatWindDirection(weather.wind_direction_10m);
  
  return `
# Current Weather for ${location ? `${location.name}, ${location.country}` : `Coordinates (${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)})`}

**Conditions:** ${weatherDesc}
**Temperature:** ${weather.temperature_2m}°C (Feels like: ${weather.apparent_temperature}°C)
**Humidity:** ${weather.relative_humidity_2m}%
**Wind:** ${weather.wind_speed_10m} km/h ${windDirection}${weather.wind_gusts_10m > weather.wind_speed_10m * 1.5 ? ` with gusts up to ${weather.wind_gusts_10m} km/h` : ''}
**Cloud Cover:** ${weather.cloud_cover}%
**Precipitation:** ${weather.precipitation} mm${weather.rain > 0 ? ` (Rain: ${weather.rain} mm)` : ''}

*Updated: ${new Date().toLocaleString()}*
  `;
}

/**
 * Format forecast data as a markdown string
 * @param {Object} forecast - Forecast data
 * @param {Object} location - Location data
 * @param {number} days - Number of days in forecast
 * @returns {string} Formatted markdown
 */
export function formatForecast(forecast, location, days) {
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
  
  return formattedResponse;
}
