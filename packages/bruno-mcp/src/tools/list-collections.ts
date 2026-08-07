import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { textResult, type ToolContext } from './helpers.js';

export const registerListCollectionsTool = (server: McpServer, { registry }: ToolContext): void => {
  server.registerTool(
    'list_collections',
    {
      title: 'List Bruno collections',
      description:
        'List the Bruno collections this MCP server has been configured to expose. Returns id, name, filesystem path, and available environments for each.',
      inputSchema: {},
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async () => {
      registry.refresh();
      return textResult(registry.list());
    }
  );
};
