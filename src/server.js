import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

/**
 * Creates and configures the MCP server
 * @returns {McpServer} The configured MCP server instance
 */
export function createServer() {
  return new McpServer({
    name: "Weather Information Server",
    version: "1.0.0"
  });
}
