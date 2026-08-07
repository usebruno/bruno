import { createRequire } from 'node:module';

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

import { CollectionRegistry } from './core/collections.js';
import { registerTools } from './tools/index.js';
import type { DiscoveryConfig } from './types.js';

const require = createRequire(import.meta.url);
const { version: SERVER_VERSION } = require('../package.json');

const SERVER_NAME = 'bruno-mcp';

interface CreateServerArgs {
  config: DiscoveryConfig;
  verbose?: boolean;
}

export const createServer = ({ config, verbose = false }: CreateServerArgs): McpServer => {
  const registry = new CollectionRegistry(config);
  const server = new McpServer({ name: SERVER_NAME, version: SERVER_VERSION });

  registerTools(server, { registry, verbose });

  return server;
};