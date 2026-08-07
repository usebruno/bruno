import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import type { ToolContext } from './helpers.js';
import { registerListCollectionsTool } from './list-collections.js';
import { registerListRequestsTool } from './list-requests.js';
import { registerExecuteRequestTool } from './execute-request.js';

// The server exposes three read/execute tools: list collections, list the
// requests within a collection, and execute a named request in any environment.
// Each is self-contained (depends only on ./helpers and core/), so registration
// order is immaterial.
export const registerTools = (server: McpServer, ctx: ToolContext): void => {
  registerListCollectionsTool(server, ctx);
  registerListRequestsTool(server, ctx);
  registerExecuteRequestTool(server, ctx);
};

export type { ToolContext } from './helpers.js';
