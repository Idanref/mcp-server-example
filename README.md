### Run with inspector:
> npx @modelcontextprotocol/inspector node index.js

### Start the server to integrate with Claude / other supporting LLMs:
> node src/index.js

### Setup Claude Desktop to support the server:

#### JSON Path:
> nano ~/Library/Application\ Support/Claude/claude_desktop_config.json

#### JSON Config:

```
{
  "mcpServers": {
    "my-mcp-server": {
      "command": "node",
      "args": [
        <path to src/index.js>
      ],
      "env": {
        "NODE_OPTIONS": "--no-deprecation"
      }
    }
  }
}
```