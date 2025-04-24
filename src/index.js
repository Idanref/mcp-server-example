import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";

// Create server instance
const server = new McpServer({
  name: "my-mcp-server",
  version: "1.0.0",
  capabilities: {
    resources: {
      system: {}
    },
    tools: {},
  },
});

// Add a resource provider for system info
server.resource("system", async () => {
  return {
    hostname: process.env.HOSTNAME || "localhost",
    platform: process.platform,
    nodeVersion: process.version,
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    cpuUsage: process.cpuUsage(),
  };
});

// Register tools
server.tool(
  "add",
  "Add two numbers and return their sum",
  {
    a: z.number().describe("First number"),
    b: z.number().describe("Second number"),
  },
  async ({ a, b }) => {
    const sum = a + b;
    return {
      content: [
        {
          type: "text",
          text: `The sum of ${a} and ${b} is ${sum}`,
        },
      ],
    };
  }
);

server.tool(
  "hello",
  "Say hello to someone",
  {
    name: z.string().optional().describe("Name of the person to greet"),
  },
  async ({ name }) => {
    const greeting = name ? `Hello, ${name}!` : "Hello, world!";
    return {
      content: [
        {
          type: "text",
          text: greeting,
        },
      ],
    };
  }
);

// Add a more complex tool that generates random data
server.tool(
  "generateData",
  "Generate an array of random data points",
  {
    count: z.number().min(1).max(100).default(10).describe("Number of data points to generate"),
    type: z.enum(["number", "string", "boolean"]).default("number").describe("Type of data to generate"),
  },
  async ({ count, type }) => {
    const data = [];
    
    for (let i = 0; i < count; i++) {
      if (type === "number") {
        data.push(Math.random() * 100);
      } else if (type === "string") {
        const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        let result = "";
        const length = Math.floor(Math.random() * 10) + 5;
        for (let j = 0; j < length; j++) {
          result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        data.push(result);
      } else if (type === "boolean") {
        data.push(Math.random() > 0.5);
      }
    }
    
    return {
      content: [
        {
          type: "text",
          text: `Generated ${count} ${type} data points: ${JSON.stringify(data, null, 2)}`,
        },
      ],
    };
  }
);

// Start the server
async function main() {
  try {
    console.error("Starting MCP Server...");
    const transport = new StdioServerTransport();
    
    // Add debug logging for understanding the communication
    transport.onSend = (message) => {
      console.error(`[DEBUG] Sent: ${JSON.stringify(message).slice(0, 200)}...`);
    };
    
    transport.onReceive = (message) => {
      console.error(`[DEBUG] Received: ${JSON.stringify(message).slice(0, 200)}...`);
    };
    
    await server.connect(transport);
    console.error("MCP Server running on stdio");
  } catch (error) {
    console.error("Error starting MCP server:", error);
    process.exit(1);
  }
}

// Handle process termination gracefully
process.on('SIGINT', () => {
  console.error("Shutting down MCP server...");
  process.exit(0);
});

process.on('uncaughtException', (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
