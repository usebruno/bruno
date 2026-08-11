import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { executeRequest } from '../core/execute.js';
import { textResult, unknownCollectionMessage, variablesSchema, type ToolContext } from './helpers.js';

export const registerExecuteRequestTool = (server: McpServer, { registry, verbose }: ToolContext): void => {
  server.registerTool(
    'execute_request',
    {
      title: 'Execute a Bruno request',
      description:
        "Execute a named request from a Bruno collection through Bruno's runtime, applying the collection's environment variables, scripts, assertions, tests, and configured auth. " +
        'Sensitive data is withheld: all request and response headers are omitted and URL query values are redacted. ' +
        'Returns status, response body, and assertion/test results; large bodies are truncated.',
      inputSchema: {
        collectionId: z.string().describe('Collection id returned by list_collections.'),
        requestPath: z
          .string()
          .describe('Relative path of the request inside the collection, as returned by list_requests (e.g. "users/get-user.bru").'),
        environment: z.string().optional().describe('Environment name to run against. Omit to run with no environment.'),
        variables: variablesSchema()
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: true,
        idempotentHint: false,
        openWorldHint: true
      }
    },
    async ({ collectionId, requestPath, environment, variables }) => {
      registry.refresh();
      const collection = registry.resolve(collectionId);
      if (!collection) {
        return textResult(unknownCollectionMessage(registry, collectionId), true);
      }

      const requests = registry.listRequests(collectionId) || [];
      if (!requests.some((r) => r.relativePath === requestPath)) {
        const known = requests.map((r) => r.relativePath);
        return textResult(
          {
            error: `Request not found in collection "${collection.name}": ${requestPath}`,
            hint: 'Use the exact relativePath from list_requests.',
            availableRequests: known
          },
          true
        );
      }

      if (environment) {
        const envs = registry.environments(collectionId);
        if (!envs.includes(environment)) {
          return textResult(
            {
              error: `Unknown environment "${environment}" in collection "${collection.name}".`,
              hint: 'Environment names are case-sensitive. Omit environment to run with none.',
              availableEnvironments: envs
            },
            true
          );
        }
      }

      try {
        const result = await executeRequest({
          collectionPath: collection.path,
          requestPath,
          environment,
          variables,
          verbose
        });
        return textResult(result, !result.ok);
      } catch (err: any) {
        return textResult({ error: err && err.message ? err.message : String(err) }, true);
      }
    }
  );
};
