/**
 * This file has been deprecated. The Bruno filestore now handles format-specific operations.
 * Please import directly from @usebruno/filestore instead of using this intermediary.
 * 
 * Example:
 * const { parseRequest, stringifyRequest } = require('@usebruno/filestore');
 * 
 * Note: The bru.js file in the bruno-js package is unrelated to this file and provides
 * runtime helpers for variables, environment, etc. It should not be changed.
 */

const { 
  parseEnvironment,
  parseRequest,
  parseCollection,
  stringifyEnvironment,
  stringifyRequest,
  stringifyCollection,
  parse,
  stringify
} = require('@usebruno/filestore');
const { workerConfig } = require('../workers/parser-worker');

// For backward compatibility
module.exports = {
  // Parse functions
  parseEnv: parseEnvironment,
  parse: parseRequest,
  parseCollection,
  parseViaWorker: (content) => {
    return parse(content, { worker: true, workerConfig });
  },

  // Stringify functions
  stringifyEnv: stringifyEnvironment,
  stringify: stringifyRequest,
  stringifyCollection,
  stringifyViaWorker: (json) => {
    return stringify(json, { worker: true, workerConfig });
  }
};
