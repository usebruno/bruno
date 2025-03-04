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

module.exports = {
  // Backward compatibility exports for any remaining imports
  fileToJson: require('@usebruno/filestore').parseRequest,
  jsonToFile: require('@usebruno/filestore').stringifyRequest,
  envFileToJson: require('@usebruno/filestore').parseEnvironment,
  envJsonToFile: require('@usebruno/filestore').stringifyEnvironment,
  collectionFileToJson: require('@usebruno/filestore').parseCollection,
  jsonToCollectionFile: require('@usebruno/filestore').stringifyCollection,
  
  // For worker operations, use the parse/stringify functions with worker option
  fileToJsonViaWorker: async (data) => {
    const { parse } = require('@usebruno/filestore');
    const { workerConfig } = require('../workers/parser-worker');
    return parse(data, { worker: true, workerConfig });
  },
  
  jsonToFileViaWorker: async (json) => {
    const { stringify } = require('@usebruno/filestore');
    const { workerConfig } = require('../workers/parser-worker');
    return stringify(json, { worker: true, workerConfig });
  }
};
