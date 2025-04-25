/**
 * A wrapper class for MCP server functionality
 * Makes it easier to register tools and resources with consistent error handling
 */
export class McpWrapper {
  /**
   * Create a new MCP wrapper
   * @param {McpServer} server - MCP server instance
   */
  constructor(server) {
    this.server = server;
  }

  /**
   * Register a tool with the server
   * @param {string} name - Tool name
   * @param {Object} schema - Zod schema for tool parameters
   * @param {Function} handler - Async handler function for the tool
   * @param {Object} options - Tool options (description, etc.)
   * @returns {McpWrapper} This wrapper instance for chaining
   */
  registerTool(name, schema, handler, options = {}) {
    this.server.tool(
      name, 
      schema, 
      async (params) => {
        try {
          const result = await handler(params);
          return this._formatToolResponse(result);
        } catch (error) {
          return this._formatToolError(error);
        }
      },
      options
    );
    return this;
  }

  /**
   * Register multiple tools at once
   * @param {Array<Object>} tools - Array of tool definitions
   * @returns {McpWrapper} This wrapper instance for chaining
   */
  registerTools(tools) {
    for (const tool of tools) {
      this.registerTool(
        tool.name,
        tool.schema,
        tool.handler,
        tool.options
      );
    }
    return this;
  }

  /**
   * Register a resource with the server
   * @param {string} name - Resource name
   * @param {ResourceTemplate} template - Resource template
   * @param {Function} handler - Async handler function for the resource
   * @returns {McpWrapper} This wrapper instance for chaining
   */
  registerResource(name, template, handler) {
    this.server.resource(
      name,
      template,
      async (uri, params) => {
        try {
          const result = await handler(uri, params);
          return this._formatResourceResponse(uri, result);
        } catch (error) {
          return this._formatResourceError(uri, error);
        }
      }
    );
    return this;
  }

  /**
   * Register multiple resources at once
   * @param {Array<Object>} resources - Array of resource definitions
   * @returns {McpWrapper} This wrapper instance for chaining
   */
  registerResources(resources) {
    for (const resource of resources) {
      this.registerResource(
        resource.name,
        resource.template,
        resource.handler
      );
    }
    return this;
  }

  /**
   * Format a tool response consistently
   * @param {string|Object} result - Result from handler
   * @returns {Object} Formatted tool response
   * @private
   */
  _formatToolResponse(result) {
    // If result is already formatted, return it
    if (result && result.content) {
      return result;
    }
    
    // If result is a string, format it as text
    if (typeof result === 'string') {
      return {
        content: [{
          type: 'text',
          text: result
        }]
      };
    }
    
    // Otherwise, format as JSON
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  /**
   * Format a tool error consistently
   * @param {Error} error - Error object
   * @returns {Object} Formatted tool error response
   * @private
   */
  _formatToolError(error) {
    return {
      content: [{
        type: 'text',
        text: `Error: ${error.message}`
      }]
    };
  }

  /**
   * Format a resource response consistently
   * @param {URL} uri - Resource URI
   * @param {string|Object} result - Result from handler
   * @returns {Object} Formatted resource response
   * @private
   */
  _formatResourceResponse(uri, result) {
    // If result is already formatted, return it
    if (result && result.contents) {
      return result;
    }
    
    // If result is a string, format it as text
    if (typeof result === 'string') {
      return {
        contents: [{
          uri: uri.href,
          text: result
        }]
      };
    }
    
    // Otherwise, format as JSON
    return {
      contents: [{
        uri: uri.href,
        text: JSON.stringify(result, null, 2)
      }]
    };
  }

  /**
   * Format a resource error consistently
   * @param {URL} uri - Resource URI
   * @param {Error} error - Error object
   * @returns {Object} Formatted resource error response
   * @private
   */
  _formatResourceError(uri, error) {
    return {
      contents: [{
        uri: uri.href,
        text: `Error: ${error.message}`
      }]
    };
  }
}

/**
 * Create a new MCP wrapper for the given server
 * @param {McpServer} server - MCP server instance
 * @returns {McpWrapper} MCP wrapper instance
 */
export function createMcpWrapper(server) {
  return new McpWrapper(server);
}
