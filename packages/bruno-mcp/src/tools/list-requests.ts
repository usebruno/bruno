import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { filterRequests } from '../core/collections.js';
import { textResult, unknownCollectionMessage, type ToolContext } from './helpers.js';

export const registerListRequestsTool = (server: McpServer, { registry }: ToolContext): void => {
  server.registerTool(
    'list_requests',
    {
      title: 'List requests in a Bruno collection',
      description:
        'List every HTTP/GraphQL request in the given collection, flattened across folders. ' +
        'Returns the relative path used to invoke execute_request, plus method and URL when statically known. ' +
        'Optionally filter by a search term (matched against name, path, and URL) and/or HTTP method.',
      inputSchema: {
        collectionId: z.string().describe('Collection id returned by list_collections.'),
        search: z
          .string()
          .optional()
          .describe('Case-insensitive substring filter matched against request name, relative path, and URL.'),
        method: z.string().optional().describe('Filter by HTTP method, e.g. "GET" or "post" (case-insensitive).')
      },
      annotations: {
        readOnlyHint: true,
        openWorldHint: false
      }
    },
    async ({ collectionId, search, method }) => {
      registry.refresh();
      const collection = registry.resolve(collectionId);
      if (!collection) {
        return textResult(unknownCollectionMessage(registry, collectionId), true);
      }
      const all = registry.listRequests(collectionId) || [];
      const requests = filterRequests(all, { search, method });
      const noMatch = (search || method) && requests.length === 0 && all.length > 0;
      return textResult({
        collectionId,
        collectionName: collection.name,
        total: all.length,
        count: requests.length,
        filter: { search: search || null, method: method || null },
        ...(noMatch
          ? { hint: `No requests matched the filter. Call list_requests without "search"/"method" to see all ${all.length}.` }
          : {}),
        requests
      });
    }
  );
};
