/**
 * Model Context Protocol (MCP) Server for ERC-8004 Agent Data
 *
 * This endpoint implements the MCP specification using Server-Sent Events (SSE) transport
 * to provide AI tools with access to ERC-8004 agent registry and reputation data.
 *
 * The server exposes 5 tools:
 * - search_agents: Search agents by name/description
 * - get_agent: Get detailed agent information
 * - get_reputation: Get agent reputation breakdown
 * - get_agent_feedbacks: Get agent kudos/feedback
 * - list_leaderboard: Get top agents by chain
 *
 * All data is proxied from the 8004scan API with authentication.
 *
 * Usage:
 * - GET /api/mcp: Establish SSE connection
 * - POST /api/mcp: Send tool calls and list requests
 * - OPTIONS /api/mcp: CORS preflight
 */

import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://www.8004scan.io/api/v1';
const API_KEY = process.env.EIGHTOOSCAN_API_KEY;

if (!API_KEY) {
  console.error('EIGHTOOSCAN_API_KEY environment variable is required');
}

function getAllowedOrigin(): string {
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  const domain = process.env.NEXT_PUBLIC_APP_DOMAIN || 'ack-onchain.dev';
  return `https://${domain}`;
}

interface Agent {
  token_id: string;
  chain_id: number;
  name: string;
  description?: string;
  owner_address: string;
  total_score?: number;
  total_feedbacks?: number;
  is_verified: boolean;
  image_url?: string;
  tags?: string[];
  scores?: Record<string, number>;
}

interface AgentsResponse {
  items: Agent[];
  total: number;
  limit: number;
  offset: number;
}

interface Feedback {
  id: string;
  tag1?: string;
  tag2?: string;
  value?: number;
  feedback?: string;
  created_at?: string;
}

interface FeedbacksResponse {
  items: Feedback[];
  total: number;
}

/**
 * Make authenticated request to 8004scan API
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function apiRequest(path: string): Promise<any> {
  const url = `${API_BASE}/${path}`;
  const response = await fetch(url, {
    headers: {
      Accept: 'application/json',
      'X-API-Key': API_KEY || '',
    },
    next: { revalidate: 30 },
  });

  if (!response.ok) {
    throw new Error(
      `API request failed: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

/**
 * Handle SSE (Server-Sent Events) connection for MCP transport
 * GET requests establish the SSE connection
 */
export async function GET(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: 'Server configuration error: API key not set' },
      { status: 500 }
    );
  }

  // Set up SSE headers
  const headers = new Headers({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
    'Access-Control-Allow-Origin': getAllowedOrigin(),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'X-API-Version': '1',
  });

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection message
      const welcome = {
        jsonrpc: '2.0',
        method: 'notifications/initialized',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'ack-protocol-server',
            version: '1.0.0',
          },
        },
      };

      controller.enqueue(`data: ${JSON.stringify(welcome)}\n\n`);

      // Keep connection alive with periodic pings
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(`data: ${JSON.stringify({ type: 'ping' })}\n\n`);
        } catch {
          clearInterval(pingInterval);
        }
      }, 30000);

      // Cleanup when client disconnects
      request.signal?.addEventListener('abort', () => {
        clearInterval(pingInterval);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, { headers });
}

/**
 * Handle tool calls via POST requests
 */
export async function POST(request: NextRequest) {
  if (!API_KEY) {
    return NextResponse.json(
      { error: 'Server configuration error: API key not set' },
      { status: 500 }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();

    // Handle initialize requests (MCP protocol handshake)
    if (body.method === 'initialize') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {},
          },
          serverInfo: {
            name: 'ack-protocol-server',
            version: '1.0.0',
          },
        },
      });
    }

    // Handle notifications (no response needed per spec, but return OK)
    if (body.method === 'notifications/initialized') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {},
      });
    }

    // Handle ping
    if (body.method === 'ping') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {},
      });
    }

    // Handle prompts/list requests
    if (body.method === 'prompts/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          prompts: [
            {
              name: 'reputation_check',
              description:
                'Check the onchain reputation of an ERC-8004 registered agent including quality score, feedback count, and category breakdown',
              arguments: [
                {
                  name: 'chain_id',
                  description:
                    'The chain ID where the agent is registered (e.g. 2741 for Abstract)',
                  required: true,
                },
                {
                  name: 'token_id',
                  description: 'The token ID of the agent to check',
                  required: true,
                },
              ],
            },
            {
              name: 'trust_assessment',
              description:
                'Assess whether an agent should be trusted based on their reputation history, feedback patterns, peer endorsements, and verification status',
              arguments: [
                {
                  name: 'chain_id',
                  description:
                    'The chain ID where the agent is registered (e.g. 2741 for Abstract)',
                  required: true,
                },
                {
                  name: 'token_id',
                  description: 'The token ID of the agent to assess',
                  required: true,
                },
              ],
            },
          ],
        },
      });
    }

    // Handle resources/list requests
    if (body.method === 'resources/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          resources: [
            {
              uri: 'erc8004://registry/agents',
              name: 'agent_registry',
              description:
                'ERC-8004 Identity Registry containing all registered agents across supported chains',
              mimeType: 'application/json',
            },
            {
              uri: 'erc8004://registry/reputation',
              name: 'reputation_registry',
              description:
                'ERC-8004 Reputation Registry containing feedback, kudos, and scores for all agents',
              mimeType: 'application/json',
            },
          ],
        },
      });
    }

    // Handle tools/list requests
    if (body.method === 'tools/list') {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: body.id,
        result: {
          tools: [
            {
              name: 'search_agents',
              description: 'Search ERC-8004 agents by name, chain, or category',
              inputSchema: {
                type: 'object',
                properties: {
                  query: {
                    type: 'string',
                    description: 'Search query for agent names or descriptions',
                  },
                  chain_id: {
                    type: 'number',
                    description: 'Optional chain ID to filter results',
                  },
                  limit: {
                    type: 'number',
                    description:
                      'Optional limit for number of results (default: 20, max: 100)',
                    default: 20,
                  },
                },
                required: ['query'],
              },
            },
            {
              name: 'get_agent',
              description: 'Get detailed information about a specific agent',
              inputSchema: {
                type: 'object',
                properties: {
                  chain_id: {
                    type: 'number',
                    description: 'Chain ID of the agent',
                  },
                  token_id: {
                    type: 'number',
                    description: 'Token ID of the agent',
                  },
                },
                required: ['chain_id', 'token_id'],
              },
            },
            {
              name: 'get_reputation',
              description: "Get an agent's reputation breakdown and scores",
              inputSchema: {
                type: 'object',
                properties: {
                  chain_id: {
                    type: 'number',
                    description: 'Chain ID of the agent',
                  },
                  token_id: {
                    type: 'number',
                    description: 'Token ID of the agent',
                  },
                },
                required: ['chain_id', 'token_id'],
              },
            },
            {
              name: 'get_agent_feedbacks',
              description: 'Get kudos and feedback for a specific agent',
              inputSchema: {
                type: 'object',
                properties: {
                  chain_id: {
                    type: 'number',
                    description: 'Chain ID of the agent',
                  },
                  token_id: {
                    type: 'number',
                    description: 'Token ID of the agent',
                  },
                  limit: {
                    type: 'number',
                    description:
                      'Optional limit for number of feedbacks (default: 50)',
                    default: 50,
                  },
                },
                required: ['chain_id', 'token_id'],
              },
            },
            {
              name: 'list_leaderboard',
              description: 'Get top agents by chain (leaderboard)',
              inputSchema: {
                type: 'object',
                properties: {
                  chain_id: {
                    type: 'number',
                    description:
                      'Optional chain ID (default: 2741 for Abstract)',
                    default: 2741,
                  },
                  sort_by: {
                    type: 'string',
                    description:
                      'Sort criterion: quality_score, total_feedbacks, or star_count',
                    enum: ['quality_score', 'total_feedbacks', 'star_count'],
                    default: 'quality_score',
                  },
                  limit: {
                    type: 'number',
                    description:
                      'Optional limit for number of results (default: 20, max: 100)',
                    default: 20,
                  },
                },
                required: [],
              },
            },
          ],
        },
      });
    }

    // Handle tools/call requests
    if (body.method === 'tools/call') {
      const { name, arguments: args } = body.params;

      switch (name) {
        case 'search_agents': {
          const {
            query,
            chain_id,
            limit = 20,
          } = args as {
            query: string;
            chain_id?: number;
            limit?: number;
          };
          const params = new URLSearchParams({
            search: query,
            limit: Math.min(limit, 100).toString(),
          });
          if (chain_id) {
            params.set('chain_id', chain_id.toString());
          }

          const data: AgentsResponse = await apiRequest(
            `agents?${params.toString()}`
          );
          return NextResponse.json({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      agents: data.items,
                      total: data.total,
                      query,
                      chain_id,
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          });
        }

        case 'get_agent': {
          const { chain_id, token_id } = args as {
            chain_id: number;
            token_id: number;
          };
          const data: Agent = await apiRequest(
            `agents/${chain_id}/${token_id}`
          );
          return NextResponse.json({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(data, null, 2),
                },
              ],
            },
          });
        }

        case 'get_reputation': {
          const { chain_id, token_id } = args as {
            chain_id: number;
            token_id: number;
          };
          const data: Agent = await apiRequest(
            `agents/${chain_id}/${token_id}`
          );

          // Extract and format reputation/scoring data
          const reputation = {
            agent_id: `${chain_id}:${token_id}`,
            name: data.name,
            total_score: data.total_score || 0,
            total_feedbacks: data.total_feedbacks || 0,
            is_verified: data.is_verified,
            scores: data.scores || {},
            owner_address: data.owner_address,
          };

          return NextResponse.json({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(reputation, null, 2),
                },
              ],
            },
          });
        }

        case 'get_agent_feedbacks': {
          const {
            chain_id,
            token_id,
            limit = 50,
          } = args as {
            chain_id: number;
            token_id: number;
            limit?: number;
          };
          const params = new URLSearchParams({
            limit: Math.min(limit, 100).toString(),
          });

          const data: FeedbacksResponse = await apiRequest(
            `agents/${chain_id}/${token_id}/feedbacks?${params.toString()}`
          );

          return NextResponse.json({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      agent_id: `${chain_id}:${token_id}`,
                      feedbacks: data.items,
                      total: data.total,
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          });
        }

        case 'list_leaderboard': {
          const {
            chain_id = 2741,
            sort_by = 'quality_score',
            limit = 20,
          } = args as {
            chain_id?: number;
            sort_by?: string;
            limit?: number;
          };
          const params = new URLSearchParams({
            limit: Math.min(limit, 100).toString(),
            sort_by,
            sort_order: 'desc',
          });

          if (chain_id) {
            params.set('chain_id', chain_id.toString());
          }

          const data: AgentsResponse = await apiRequest(
            `agents?${params.toString()}`
          );

          return NextResponse.json({
            jsonrpc: '2.0',
            id: body.id,
            result: {
              content: [
                {
                  type: 'text',
                  text: JSON.stringify(
                    {
                      leaderboard: data.items,
                      total: data.total,
                      chain_id,
                      sort_by,
                    },
                    null,
                    2
                  ),
                },
              ],
            },
          });
        }

        default:
          return NextResponse.json({
            jsonrpc: '2.0',
            id: body.id,
            error: {
              code: -32601,
              message: `Unknown tool: ${name}`,
            },
          });
      }
    }

    return NextResponse.json({
      jsonrpc: '2.0',
      id: body.id,
      error: {
        code: -32601,
        message: 'Unsupported method',
      },
    });
  } catch (error) {
    console.error('MCP request error:', error);
    return NextResponse.json({
      jsonrpc: '2.0',
      id: body?.id || null,
      error: {
        code: -32603,
        message:
          error instanceof Error ? error.message : 'Internal server error',
        data:
          process.env.NODE_ENV === 'development'
            ? error instanceof Error
              ? error.stack
              : String(error)
            : undefined,
      },
    });
  }
}

/**
 * Handle CORS preflight requests
 */
export async function OPTIONS() {
  return NextResponse.json(
    {},
    {
      headers: {
        'Access-Control-Allow-Origin': getAllowedOrigin(),
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'X-API-Version': '1',
      },
    }
  );
}
