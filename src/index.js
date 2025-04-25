import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";
import { registerWeatherResources } from "./resources/weatherResource.js";
import { registerWeatherTools } from "./tools/weatherTools.js";
import { createMcpWrapper } from "./helpers/mcpWrapper.js";

async function startServer() {
  try {
    // Create the MCP server
    const server = createServer();
    const mcpWrapper = createMcpWrapper(server);
    
    // Register resources and tools
    registerWeatherResources(server);
    registerWeatherTools(server);
    
    // Start the server with stdio transport
    const transport = new StdioServerTransport();
    await server.connect(transport);
    process.stderr.write("Weather MCP Server started\n");
  } catch (err) {
    process.stderr.write(`Failed to start server: ${err}\n`);
  }
}

startServer();