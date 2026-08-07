import { z } from 'zod';
import type { CallToolResult } from '@modelcontextprotocol/sdk/types.js';

import type { CollectionRegistry } from '../core/collections.js';

// Everything a tool handler needs from the server: the collection registry and
// the verbose flag. Passed to every register<Tool> function.
export interface ToolContext {
  registry: CollectionRegistry;
  verbose: boolean;
}

export const textResult = (obj: unknown, isError = false): CallToolResult => ({
  content: [
    {
      type: 'text',
      text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2)
    }
  ],
  ...(isError ? { isError: true } : {})
});

export const unknownCollectionMessage = (registry: CollectionRegistry, collectionId: string) => ({
  error: `Unknown collectionId: ${collectionId}.`,
  hint: 'Call list_collections to see valid ids.',
  availableCollections: registry.list().map((c) => ({ id: c.id, name: c.name }))
});

// Optional per-run variable overrides, shared by execute_request and run_collection.
export const variablesSchema = () =>
  z
    .record(z.string(), z.union([z.string(), z.number(), z.boolean()]))
    .optional()
    .describe(
      'Override (or add) environment variables for this run only (maps to bru run --env-var name=value). Values are applied on top of the selected environment; names not already defined are added as run-scoped variables.'
    );
