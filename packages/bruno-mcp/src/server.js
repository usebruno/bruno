const path = require('path');

const { CollectionRegistry } = require('./collections');
const { executeRequest } = require('./execute');
const { createCollection, createRequest, createEnvironment } = require('./author');

const SERVER_NAME = 'bruno-mcp';
const SERVER_VERSION = require('../package.json').version;

const textResult = (obj, isError = false) => ({
  content: [
    {
      type: 'text',
      text: typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2)
    }
  ],
  ...(isError ? { isError: true } : {})
});

const buildServer = async ({ entries, verbose = false }) => {
  const { McpServer } = await import('@modelcontextprotocol/sdk/server/mcp.js');
  const { z } = await import('zod');

  const registry = new CollectionRegistry(entries || []);
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  server.registerTool(
    'list_collections',
    {
      title: 'List Bruno collections',
      description: 'List the Bruno collections this MCP server has been configured to expose. Returns id, name, filesystem path, and available environments for each.',
      inputSchema: {}
    },
    async () => textResult(registry.list())
  );

  server.registerTool(
    'list_requests',
    {
      title: 'List requests in a Bruno collection',
      description: 'List every HTTP/GraphQL request in the given collection, flattened across folders. Returns the relative path used to invoke execute_request, plus method and URL when statically known.',
      inputSchema: {
        collectionId: z.string().describe('Collection id returned by list_collections.')
      }
    },
    async ({ collectionId }) => {
      const collection = registry.resolve(collectionId);
      if (!collection) {
        return textResult(`Unknown collectionId: ${collectionId}. Call list_collections to see valid ids.`, true);
      }
      const requests = registry.listRequests(collectionId);
      return textResult({ collectionId, collectionName: collection.name, requests });
    }
  );

  server.registerTool(
    'execute_request',
    {
      title: 'Execute a Bruno request',
      description: 'Execute a named request from a Bruno collection through Bruno\'s runtime (reuses auth, environment variables, scripts, and OAuth2 cached tokens from the Bruno desktop app). Returns status, headers, body, assertions, and test results. Large bodies are truncated and spilled to a temp file path.',
      inputSchema: {
        collectionId: z.string().describe('Collection id returned by list_collections.'),
        requestPath: z.string().describe('Relative path of the request inside the collection, as returned by list_requests (e.g. "users/get-user.bru").'),
        environment: z.string().optional().describe('Environment name to run against. Omit to run with no environment.')
      }
    },
    async ({ collectionId, requestPath, environment }) => {
      const collection = registry.resolve(collectionId);
      if (!collection) {
        return textResult(`Unknown collectionId: ${collectionId}. Call list_collections to see valid ids.`, true);
      }
      try {
        const result = await executeRequest({
          collectionPath: collection.path,
          requestPath,
          environment,
          verbose
        });
        return textResult(result, !result.ok);
      } catch (err) {
        return textResult({ error: err && err.message ? err.message : String(err) }, true);
      }
    }
  );

  server.registerTool(
    'create_collection',
    {
      title: 'Create a new Bruno collection',
      description: 'Create a new Bruno collection on disk at outputPath/<name>. Format defaults to yml (matches Bruno desktop default) but can be bru. The new collection is immediately registered so subsequent list_collections / list_requests / create_request calls can target it via its returned collectionId without restarting the MCP server. Fails if the target directory is non-empty.',
      inputSchema: {
        name: z.string().describe('Human-readable collection name. Also used as the directory name (after sanitization).'),
        outputPath: z.string().describe('Absolute path to the parent directory where the collection folder will be created.'),
        format: z.enum(['yml', 'bru']).optional().describe('File format for the collection (default: yml).')
      }
    },
    async ({ name, outputPath, format }) => {
      try {
        const { collectionPath, format: usedFormat } = await createCollection({ name, outputPath, format });
        const entry = registry.register(collectionPath);
        return textResult({
          collectionId: entry.id,
          collectionPath,
          format: usedFormat,
          name: entry.name
        });
      } catch (err) {
        return textResult({ error: err && err.message ? err.message : String(err) }, true);
      }
    }
  );

  server.registerTool(
    'create_request',
    {
      title: 'Create a new Bruno request',
      description: 'Create a new HTTP request file inside an existing Bruno collection. Format (.bru vs .yml) is auto-detected from the collection\'s config file — no template drift. Fails if the file already exists.',
      inputSchema: {
        collectionId: z.string().describe('Collection id returned by list_collections or create_collection.'),
        name: z.string().describe('Request name. Becomes the filename (after sanitization).'),
        method: z.enum(['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS']).optional().describe('HTTP method (default: GET).'),
        url: z.string().describe('Request URL. May contain Bruno variables like {{baseUrl}}/path.'),
        folder: z.string().optional().describe('Optional relative folder path inside the collection (e.g. "users/active"). Created if missing. Must not be absolute or contain "..".'),
        headers: z.array(z.object({
          name: z.string(),
          value: z.string(),
          enabled: z.boolean().optional()
        })).optional().describe('HTTP headers.'),
        body: z.object({}).passthrough().optional().describe('Bruno body object, e.g. { mode: "json", json: "..." } or { mode: "none" } (default).'),
        auth: z.object({}).passthrough().optional().describe('Bruno auth object, e.g. { mode: "bearer", bearer: { token: "{{token}}" } } or { mode: "none" } (default).'),
        seq: z.number().int().positive().optional().describe('Sequence number for ordering (default: 1).')
      }
    },
    async ({ collectionId, name, method, url, folder, headers, body, auth, seq }) => {
      const collection = registry.resolve(collectionId);
      if (!collection) {
        return textResult(`Unknown collectionId: ${collectionId}. Call list_collections to see valid ids.`, true);
      }
      try {
        const result = await createRequest({
          collectionPath: collection.path,
          name,
          method,
          url,
          folder,
          headers: (headers || []).map((h) => ({ name: h.name, value: h.value, enabled: h.enabled !== false })),
          body,
          auth,
          seq
        });
        return textResult({ collectionId, ...result });
      } catch (err) {
        return textResult({ error: err && err.message ? err.message : String(err) }, true);
      }
    }
  );

  server.registerTool(
    'create_environment',
    {
      title: 'Create a new Bruno environment',
      description: 'Create a new environment file inside an existing collection\'s environments/ folder. Format is auto-detected from the collection. Fails if the environment already exists.',
      inputSchema: {
        collectionId: z.string().describe('Collection id returned by list_collections or create_collection.'),
        name: z.string().describe('Environment name. Becomes the filename (after sanitization).'),
        variables: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().describe('Map of variable name → value. All variables are written as enabled, non-secret, text type.')
      }
    },
    async ({ collectionId, name, variables }) => {
      const collection = registry.resolve(collectionId);
      if (!collection) {
        return textResult(`Unknown collectionId: ${collectionId}. Call list_collections to see valid ids.`, true);
      }
      try {
        const result = await createEnvironment({
          collectionPath: collection.path,
          name,
          variables: variables || {}
        });
        return textResult({ collectionId, ...result });
      } catch (err) {
        return textResult({ error: err && err.message ? err.message : String(err) }, true);
      }
    }
  );

  return server;
};

const startStdioServer = async ({ entries, verbose = false, source = null }) => {
  const { StdioServerTransport } = await import('@modelcontextprotocol/sdk/server/stdio.js');
  const server = await buildServer({ entries, verbose });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  if (verbose) {
    const n = (entries || []).length;
    const src = source ? ` from ${source}` : '';
    process.stderr.write(`[bruno-mcp] stdio server ready: ${n} collection${n === 1 ? '' : 's'}${src}\n`);
  }
};

module.exports = {
  buildServer,
  startStdioServer
};
