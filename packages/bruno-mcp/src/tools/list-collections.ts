import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { filterCollections } from '../core/collections.js';
import { textResult, type ToolContext } from './helpers.js';

export const registerListCollectionsTool = (server: McpServer, { registry }: ToolContext): void => {
  server.registerTool(
    'list_collections',
    {
      title: 'List Bruno collections',
      description:
        'List the Bruno collections this MCP server has been configured to expose. ' +
        'Returns id, name, filesystem path, and available environments for each. ' +
        'Optionally filter by a search term (matched against name, path, and workspace name); ' +
        'useful when auto-discovery surfaces many collections.',
      inputSchema: {
        search: z
          .string()
          .optional()
          .describe('Case-insensitive substring filter matched against collection name, path, and workspace name.')
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async ({ search }) => {
      registry.refresh();
      const all = registry.list();
      const collections = filterCollections(all, { search });
      const noMatch = search && collections.length === 0 && all.length > 0;
      return textResult({
        total: all.length,
        count: collections.length,
        filter: { search: search || null },
        ...(noMatch
          ? { hint: `No collections matched "${search}". Call list_collections without "search" to see all ${all.length}.` }
          : {}),
        collections
      });
    }
  );
};
