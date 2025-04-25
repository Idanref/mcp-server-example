/**
 * Creates and registers a tool with the MCP server
 * @param {McpServer} server - MCP server instance
 * @param {string} name - Tool name
 * @param {Object} schema - Zod schema for tool parameters
 * @param {Function} handler - Async handler function for the tool
 * @param {Object} options - Tool options (description, etc.)
 */
export function createTool(server, name, schema, handler, options = {}) {
  server.tool(name, schema, async (params) => {
    try {
      return await handler(params);
    } catch (error) {
      return {
        content: [{
          type: "text",
          text: `Error: ${error.message}`
        }]
      };
    }
  }, options);
}

/**
 * Creates a text response for a tool
 * @param {string} text - Text content
 * @returns {Object} Tool response object
 */
export function createTextResponse(text) {
  return {
    content: [{
      type: "text",
      text: text
    }]
  };
}
