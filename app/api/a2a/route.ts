/**
 * Agent-to-Agent (A2A) Protocol endpoint for ACK Protocol.
 *
 * Implements the A2A specification using JSON-RPC over HTTP.
 * Accepts natural language queries about agents and reputation,
 * routes them to the 8004scan API, and returns structured A2A results.
 *
 * Methods:
 * - POST: Handle JSON-RPC requests (tasks/send, tasks/get, agent/info)
 * - GET: Return agent card info
 * - OPTIONS: CORS preflight
 */

import { NextRequest, NextResponse } from 'next/server';

const API_BASE = 'https://www.8004scan.io/api/v1';
const API_KEY = process.env.EIGHTOOSCAN_API_KEY;

// In-memory task store
interface A2ATask {
  id: string;
  status: 'completed' | 'failed';
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any;
  error?: string;
  createdAt: string;
}

const taskStore = new Map<string, A2ATask>();
const TASK_TTL_MS = 60 * 60 * 1000; // 1 hour

function evictStaleTasks() {
  const now = Date.now();
  for (const [id, task] of taskStore) {
    if (now - new Date(task.createdAt).getTime() > TASK_TTL_MS) {
      taskStore.delete(id);
    }
  }
}

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

function generateTaskId(): string {
  return `task-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Parse natural language query and route to the appropriate 8004scan API call.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function processTaskMessage(text: string): Promise<any> {
  const lower = text.toLowerCase();

  // Extract agent/token IDs from text (e.g., "agent 606", "token 42", "#606")
  const idMatch = lower.match(/(?:agent|token|#)\s*(\d+)/);
  const tokenId = idMatch ? parseInt(idMatch[1], 10) : null;

  // Extract chain ID if specified, default to 2741 (Abstract)
  const chainMatch = lower.match(/(?:chain|chainid|chain_id)\s*(\d+)/);
  const chainId = chainMatch ? parseInt(chainMatch[1], 10) : 2741;

  // Route: feedback/kudos queries
  if (
    tokenId &&
    (lower.includes('feedback') ||
      lower.includes('kudos') ||
      lower.includes('review'))
  ) {
    const data = await apiRequest(
      `agents/${chainId}/${tokenId}/feedbacks?limit=50`
    );
    return {
      tool: 'get_agent_feedbacks',
      agent_id: `${chainId}:${tokenId}`,
      feedbacks: data.items,
      total: data.total,
    };
  }

  // Route: reputation queries
  if (
    tokenId &&
    (lower.includes('reputation') ||
      lower.includes('score') ||
      lower.includes('trust') ||
      lower.includes('rating'))
  ) {
    const data = await apiRequest(`agents/${chainId}/${tokenId}`);
    return {
      tool: 'get_reputation',
      agent_id: `${chainId}:${tokenId}`,
      name: data.name,
      total_score: data.total_score || 0,
      total_feedbacks: data.total_feedbacks || 0,
      is_verified: data.is_verified,
      scores: data.scores || {},
    };
  }

  // Route: specific agent lookup
  if (tokenId) {
    const data = await apiRequest(`agents/${chainId}/${tokenId}`);
    return {
      tool: 'get_agent',
      agent: data,
    };
  }

  // Route: leaderboard queries
  if (
    lower.includes('leaderboard') ||
    lower.includes('top agents') ||
    lower.includes('ranking') ||
    lower.includes('best agents')
  ) {
    const sortBy = lower.includes('feedback')
      ? 'total_feedbacks'
      : 'quality_score';
    const limitMatch = lower.match(/top\s*(\d+)/);
    const limit = limitMatch ? parseInt(limitMatch[1], 10) : 20;
    const params = new URLSearchParams({
      limit: Math.min(limit, 100).toString(),
      sort_by: sortBy,
      sort_order: 'desc',
      chain_id: chainId.toString(),
    });
    const data = await apiRequest(`agents?${params.toString()}`);
    return {
      tool: 'list_leaderboard',
      leaderboard: data.items,
      total: data.total,
      chain_id: chainId,
      sort_by: sortBy,
    };
  }

  // Route: search queries (default)
  const searchQuery = text.trim();
  const params = new URLSearchParams({
    search: searchQuery,
    limit: '20',
  });
  const data = await apiRequest(`agents?${params.toString()}`);
  return {
    tool: 'search_agents',
    agents: data.items,
    total: data.total,
    query: searchQuery,
  };
}

const agentInfo = {
  name: 'ACK',
  description:
    'ACK (Agent Consensus Kudos) is a peer-driven reputation layer for AI agents on Abstract. Built on ERC-8004, ACK surfaces trust through consensus.',
  url: 'https://ack-onchain.dev',
  provider: {
    organization: 'ACK Protocol',
    url: 'https://ack-onchain.dev',
  },
  version: '1.0.0',
  capabilities: {
    streaming: false,
    pushNotifications: false,
  },
  authentication: {
    schemes: ['none'],
  },
  defaultInputModes: ['text/plain'],
  defaultOutputModes: ['application/json'],
  skills: [
    {
      id: 'search-agents',
      name: 'Search Agents',
      description: 'Search ERC-8004 registered agents by name or description',
      tags: ['erc-8004', 'agents', 'search'],
    },
    {
      id: 'get-reputation',
      name: 'Get Agent Reputation',
      description: 'Get reputation breakdown for an ERC-8004 agent',
      tags: ['erc-8004', 'reputation', 'trust'],
    },
    {
      id: 'leaderboard',
      name: 'Agent Leaderboard',
      description: 'Get top agents ranked by score or feedback count',
      tags: ['leaderboard', 'ranking'],
    },
  ],
};

const a2aHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function GET() {
  return NextResponse.json(agentInfo, {
    status: 200,
    headers: {
      ...a2aHeaders,
      'Cache-Control': 'public, max-age=3600',
    },
  });
}

export async function POST(request: NextRequest) {
  evictStaleTasks();

  if (!API_KEY) {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: {
          code: -32603,
          message: 'Server configuration error: API key not set',
        },
      },
      { status: 500, headers: a2aHeaders }
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: invalid JSON' },
      },
      { status: 400, headers: a2aHeaders }
    );
  }

  const { method, id, params } = body;

  try {
    switch (method) {
      case 'agent/info': {
        return NextResponse.json(
          { jsonrpc: '2.0', id, result: agentInfo },
          { headers: a2aHeaders }
        );
      }

      case 'tasks/send': {
        const message = params?.message;
        // A2A spec: message.parts[].text (type field optional), or nested task.message
        const taskMessage = params?.task?.message || message;
        const parts = taskMessage?.parts || [];
        const text =
          parts
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .filter((p: any) => p.text)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .map((p: any) => p.text)
            .join(' ') ||
          taskMessage?.text ||
          '';

        if (!text) {
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32602,
                message:
                  'Invalid params: message must contain text parts or a text field',
              },
            },
            { headers: a2aHeaders }
          );
        }

        const taskId = generateTaskId();

        try {
          const result = await processTaskMessage(text);
          const task: A2ATask = {
            id: taskId,
            status: 'completed',
            result,
            createdAt: new Date().toISOString(),
          };
          taskStore.set(taskId, task);

          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id,
              result: {
                id: taskId,
                status: { state: 'completed' },
                artifacts: [
                  {
                    parts: [
                      { type: 'text', text: JSON.stringify(result, null, 2) },
                    ],
                  },
                ],
              },
            },
            { headers: a2aHeaders }
          );
        } catch (err) {
          const errorMessage =
            err instanceof Error ? err.message : 'Task processing failed';
          const task: A2ATask = {
            id: taskId,
            status: 'failed',
            error: errorMessage,
            createdAt: new Date().toISOString(),
          };
          taskStore.set(taskId, task);

          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id,
              result: {
                id: taskId,
                status: {
                  state: 'failed',
                  message: { parts: [{ type: 'text', text: errorMessage }] },
                },
              },
            },
            { headers: a2aHeaders }
          );
        }
      }

      case 'tasks/get': {
        const taskId = params?.id;
        if (!taskId) {
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id,
              error: {
                code: -32602,
                message: 'Invalid params: task id is required',
              },
            },
            { headers: a2aHeaders }
          );
        }

        const task = taskStore.get(taskId);
        if (!task) {
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id,
              error: { code: -32602, message: `Task not found: ${taskId}` },
            },
            { headers: a2aHeaders }
          );
        }

        if (task.status === 'completed') {
          return NextResponse.json(
            {
              jsonrpc: '2.0',
              id,
              result: {
                id: task.id,
                status: { state: 'completed' },
                artifacts: [
                  {
                    parts: [
                      {
                        type: 'text',
                        text: JSON.stringify(task.result, null, 2),
                      },
                    ],
                  },
                ],
              },
            },
            { headers: a2aHeaders }
          );
        }

        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id,
            result: {
              id: task.id,
              status: {
                state: 'failed',
                message: {
                  parts: [{ type: 'text', text: task.error || 'Task failed' }],
                },
              },
            },
          },
          { headers: a2aHeaders }
        );
      }

      default: {
        return NextResponse.json(
          {
            jsonrpc: '2.0',
            id,
            error: {
              code: -32601,
              message: `Method not found: ${method}`,
            },
          },
          { headers: a2aHeaders }
        );
      }
    }
  } catch (error) {
    console.error('A2A request error:', error);
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: body?.id || null,
        error: {
          code: -32603,
          message:
            error instanceof Error ? error.message : 'Internal server error',
        },
      },
      { status: 500, headers: a2aHeaders }
    );
  }
}

export async function OPTIONS() {
  return NextResponse.json({}, { headers: a2aHeaders });
}
