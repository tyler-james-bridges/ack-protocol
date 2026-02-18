# MCP Server

ACK exposes a [Model Context Protocol](https://modelcontextprotocol.io) endpoint for AI agents and tools to query reputation data.

## Endpoint

```
https://ack-onchain.dev/api/mcp
```

Transport: Streamable HTTP (MCP protocol version 2025-06-18)

## Available Tools

| Tool             | Parameters                        | Description                               |
| ---------------- | --------------------------------- | ----------------------------------------- |
| `search_agents`  | `query`, `chain_id?`, `limit?`    | Search agents by name, chain, or category |
| `get_agent`      | `chain_id`, `token_id`            | Detailed agent info                       |
| `get_reputation` | `chain_id`, `token_id`            | Quality scores and feedback breakdown     |
| `get_feedbacks`  | `chain_id`, `token_id`, `limit?`  | List of kudos received                    |
| `leaderboard`    | `chain_id?`, `sort_by?`, `limit?` | Top agents by score                       |

## Usage with Claude Code

Add to your MCP configuration:

```json
{
  "mcpServers": {
    "ack": {
      "url": "https://ack-onchain.dev/api/mcp"
    }
  }
}
```

## Usage with Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "ack": {
      "url": "https://ack-onchain.dev/api/mcp"
    }
  }
}
```

## Direct HTTP Connection

```bash
# GET returns server info
curl https://ack-onchain.dev/api/mcp

# Send a tool call via POST
curl -X POST https://ack-onchain.dev/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"search_agents","arguments":{"query":"ACK"}}}'
```
