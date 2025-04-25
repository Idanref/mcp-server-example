import { ResourceTemplate } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Creates a resource template with the given pattern and options
 * @param {string} pattern - URI pattern with parameters in braces
 * @param {Object} options - Template options including list function
 * @returns {ResourceTemplate} Resource template
 */
export function createResourceTemplate(pattern, options = {}) {
  return new ResourceTemplate(pattern, options);
}

/**
 * Creates a resource response with the given URI and content
 * @param {URL} uri - Resource URI
 * @param {string} text - Content text
 * @returns {Object} Resource response object
 */
export function createResourceResponse(uri, text) {
  return {
    contents: [{
      uri: uri.href,
      text: text
    }]
  };
}

/**
 * Creates and registers a resource with the MCP server
 * @param {McpServer} server - MCP server instance
 * @param {string} name - Resource name
 * @param {ResourceTemplate} template - Resource template
 * @param {Function} handler - Async handler function for the resource
 */
export function createResource(server, name, template, handler) {
  server.resource(name, template, async (uri, params) => {
    try {
      return await handler(uri, params);
    } catch (error) {
      return {
        contents: [{
          uri: uri.href,
          text: `Error: ${error.message}`
        }]
      };
    }
  });
}
