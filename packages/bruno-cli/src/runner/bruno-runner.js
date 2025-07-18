const fs = require('fs');
const path = require('path');
const { EventEmitter } = require('events');
const { forOwn, cloneDeep } = require('lodash');
const { getRunnerSummary } = require('@usebruno/common/runner');
const { exists } = require('../utils/filesystem');
const { runSingleRequest } = require('./run-single-request');
const { bruToEnvJson, getEnvVars, getOptions } = require('../utils/bru');
const { dotenvToJson } = require('@usebruno/lang');
const constants = require('../constants');
const { findItemInCollection, createCollectionJsonFromPathname, getCallStack } = require('../utils/collection');
const { BrunoError } = require('../utils/bruno-error');
const makeJUnitOutput = require('../reporters/junit');
const makeHtmlOutput = require('../reporters/html');

/**
 * Core Bruno Runner Library
 * Provides programmatic access to Bruno collection execution
 */

const getJsSandboxRuntime = (sandbox) => {
  return sandbox === 'safe' ? 'quickjs' : 'vm2';
};

/**
 * Bruno Runner class that extends EventEmitter to provide Newman-like events
 * Emits: 'start', 'item', 'done' events
 */
class BrunoRunner extends EventEmitter {
  constructor() {
    super();
  }

  /**
   * Run Bruno collection with event emission
   * @param {Object} options - Configuration options for the runner
   * @returns {Promise<Object>} Results object with summary and detailed results
   */
  async run(options = {}) {
    const startTime = Date.now();

    // Emit start event
    this.emit('start', {
      timestamp: new Date(),
      options: { ...options }
    });

    try {
      const result = await this._runCollectionInternal(options);

      // Emit done event
      this.emit('done', {
        timestamp: new Date(),
        duration: Date.now() - startTime,
        summary: result.summary,
        results: result.results,
        totalTime: result.totalTime
      });

      return result;
    } catch (error) {
      // Emit done event even on error
      this.emit('done', {
        timestamp: new Date(),
        duration: Date.now() - startTime,
        error: error.message || error,
        summary: null,
        results: [],
        totalTime: 0
      });
      throw error;
    }
  }

  /**
   * Internal method that contains the original runCollection logic
   * @param {Object} options - Configuration options
   * @returns {Promise<Object>} Results object
   */
  async _runCollectionInternal(options = {}) {
    // This will contain the original runCollection logic
    // We'll move it here in the next step
    return await runCollectionOriginal(options, this);
  }
}

/**
 * Original run collection logic with optional event emission
 * @param {Object} options - Configuration options for the runner
 * @param {EventEmitter} eventEmitter - Optional event emitter for item events
 * @returns {Promise<Object>} Results object with summary and detailed results
 */
const runCollectionOriginal = async (options = {}, eventEmitter = null) => {
  let {
    paths,
    collectionPath = process.cwd(),
    recursive = false,
    env,
    envFile,
    envVar,
    testsOnly = false,
    bail = false,
    sandbox = 'developer',
    insecure = false,
    disableCookies = false,
    noproxy = false,
    cacert,
    ignoreTruststore = false,
    clientCertConfig,
    delay,
    reporterSkipAllHeaders = false,
    reporterSkipHeaders = [],
    generateReports
  } = options;

  if (!paths || !paths.length) {
    paths = ['./'];
    recursive = true;
  }

  try {
    let collection = createCollectionJsonFromPathname(collectionPath);
    const { root: collectionRoot, brunoConfig } = collection;

    // Handle client certificate configuration
    if (clientCertConfig) {
      const clientCertConfigExists = await exists(clientCertConfig);
      if (!clientCertConfigExists) {
        throw new BrunoError(`Client Certificate Config file "${clientCertConfig}" does not exist.`, constants.EXIT_STATUS.ERROR_FILE_NOT_FOUND);
      }

      const clientCertConfigFileContent = fs.readFileSync(clientCertConfig, 'utf8');
      let clientCertConfigJson;

      try {
        clientCertConfigJson = JSON.parse(clientCertConfigFileContent);
      } catch (err) {
        throw new BrunoError(`Failed to parse Client Certificate Config JSON: ${err.message}`, constants.EXIT_STATUS.ERROR_GENERIC);
      }

      if (clientCertConfigJson?.enabled && Array.isArray(clientCertConfigJson?.certs)) {
        if (brunoConfig.clientCertificates) {
          brunoConfig.clientCertificates.certs.push(...clientCertConfigJson.certs);
        } else {
          brunoConfig.clientCertificates = { certs: clientCertConfigJson.certs };
        }
      }
    }

    const runtimeVariables = {};
    let envVars = {};

    if (env && envFile) {
      throw new BrunoError(`Cannot use both env and envFile options together`, constants.EXIT_STATUS.ERROR_MALFORMED_ENV_OVERRIDE);
    }

    // Handle environment variables
    if (envFile || env) {
      const envFilePath = envFile
        ? path.resolve(collectionPath, envFile)
        : path.join(collectionPath, 'environments', `${env}.bru`);

      const envFileExists = await exists(envFilePath);
      if (!envFileExists) {
        const errorPath = envFile || `environments/${env}.bru`;
        throw new BrunoError(`Environment file not found: ${errorPath}`, constants.EXIT_STATUS.ERROR_ENV_NOT_FOUND);
      }

      const envBruContent = fs.readFileSync(envFilePath, 'utf8').replace(/\r\n/g, '\n');
      const envJson = bruToEnvJson(envBruContent);
      envVars = getEnvVars(envJson);
      envVars.__name__ = envFile ? path.basename(envFilePath, '.bru') : env;
    }

    // Handle environment variable overrides
    if (envVar) {
      let processVars;
      if (typeof envVar === 'string') {
        processVars = [envVar];
      } else if (typeof envVar === 'object' && Array.isArray(envVar)) {
        processVars = envVar;
      } else {
        throw new BrunoError(`overridable environment variables not parsable: use name=value`, constants.EXIT_STATUS.ERROR_MALFORMED_ENV_OVERRIDE);
      }
      if (processVars && Array.isArray(processVars)) {
        for (const value of processVars.values()) {
          const match = value.match(/^([^=]+)=(.*)$/);
          if (!match) {
            throw new BrunoError(`Overridable environment variable not correct: use name=value - presented: ${value}`, constants.EXIT_STATUS.ERROR_INCORRECT_ENV_OVERRIDE);
          }
          envVars[match[1]] = match[2];
        }
      }
    }

    // Setup options
    const runnerOptions = getOptions();
    if (bail) runnerOptions['bail'] = true;
    if (insecure) runnerOptions['insecure'] = true;
    if (disableCookies) runnerOptions['disableCookies'] = true;
    if (noproxy) runnerOptions['noproxy'] = true;

    if (cacert && cacert.length) {
      if (insecure) {
        console.warn(`Ignoring the cacert option since insecure connections are enabled`);
      } else {
        const pathExists = await exists(cacert);
        if (pathExists) {
          runnerOptions['cacert'] = cacert;
        } else {
          throw new BrunoError(`Cacert File ${cacert} does not exist`, constants.EXIT_STATUS.ERROR_FILE_NOT_FOUND);
        }
      }
    }
    runnerOptions['ignoreTruststore'] = ignoreTruststore;

    // Load .env file at root of collection if it exists
    const dotEnvPath = path.join(collectionPath, '.env');
    const dotEnvExists = await exists(dotEnvPath);
    const processEnvVars = { ...process.env };

    if (dotEnvExists) {
      const content = fs.readFileSync(dotEnvPath, 'utf8');
      const jsonData = dotenvToJson(content);
      forOwn(jsonData, (value, key) => {
        processEnvVars[key] = value;
      });
    }

    // Resolve and validate paths
    const resolvedPaths = paths.map(p => path.resolve(collectionPath, p));
    for (const resolvedPath of resolvedPaths) {
      const pathExists = await exists(resolvedPath);
      if (!pathExists) {
        throw new BrunoError(`Path not found: ${resolvedPath}`, constants.EXIT_STATUS.ERROR_FILE_NOT_FOUND);
      }
    }

    // Get request items
    let requestItems = getCallStack(resolvedPaths, collection, { recursive });

    // Filter for tests only if requested
    if (testsOnly) {
      requestItems = requestItems.filter((iter) => {
        const requestHasTests = iter.request?.tests;
        const requestHasActiveAsserts = iter.request?.assertions.some((x) => x.enabled) || false;
        return requestHasTests || requestHasActiveAsserts;
      });
    }

    const runtime = getJsSandboxRuntime(sandbox);

    // Create function to run single request by pathname
    const runSingleRequestByPathname = async (relativeItemPathname) => {
      return new Promise(async (resolve, reject) => {
        let itemPathname = path.join(collectionPath, relativeItemPathname);
        if (itemPathname && !itemPathname?.endsWith('.bru')) {
          itemPathname = `${itemPathname}.bru`;
        }
        const requestItem = cloneDeep(findItemInCollection(collection, itemPathname));
        if (requestItem) {
          const res = await runSingleRequest(
            requestItem,
            collectionPath,
            runtimeVariables,
            envVars,
            processEnvVars,
            brunoConfig,
            collectionRoot,
            runtime,
            collection,
            runSingleRequestByPathname
          );
          resolve(res?.response);
        }
        reject(`bru.runRequest: invalid request path - ${itemPathname}`);
      });
    };

    // Execute requests
    let results = [];
    let currentRequestIndex = 0;
    let nJumps = 0;

    while (currentRequestIndex < requestItems.length) {
      const requestItem = cloneDeep(requestItems[currentRequestIndex]);
      const { pathname } = requestItem;

      const start = process.hrtime();
      const result = await runSingleRequest(
        requestItem,
        collectionPath,
        runtimeVariables,
        envVars,
        processEnvVars,
        brunoConfig,
        collectionRoot,
        runtime,
        collection,
        runSingleRequestByPathname
      );

      // Handle delay between requests
      const isLastRun = currentRequestIndex === requestItems.length - 1;
      const isValidDelay = !Number.isNaN(delay) && delay > 0;
      if (isValidDelay && !isLastRun) {
        console.log(`Waiting for ${delay}ms or ${(delay/1000).toFixed(3)}s before next request.`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      if (Number.isNaN(delay) && !isLastRun) {
        console.log(`Ignoring delay because it's not a valid number.`);
      }

      const itemResult = {
        ...result,
        runtime: process.hrtime(start)[0] + process.hrtime(start)[1] / 1e9,
        suitename: pathname.replace('.bru', '')
      };

      results.push(itemResult);

      // Emit item event if eventEmitter is provided
      if (eventEmitter) {
        eventEmitter.emit('item', {
          timestamp: new Date(),
          item: {
            name: requestItem.name,
            pathname: pathname,
            request: requestItem.request
          },
          result: itemResult,
          index: currentRequestIndex,
          total: requestItems.length
        });
      }

      // Process reporter options
      if (reporterSkipAllHeaders) {
        results.forEach((result) => {
          result.request.headers = {};
          result.response.headers = {};
        });
      }

      const deleteHeaderIfExists = (headers, header) => {
        Object.keys(headers).forEach((key) => {
          if (key.toLowerCase() === header.toLowerCase()) {
            delete headers[key];
          }
        });
      };

      if (reporterSkipHeaders?.length) {
        results.forEach((result) => {
          if (result.request?.headers) {
            reporterSkipHeaders.forEach((header) => {
              deleteHeaderIfExists(result.request.headers, header);
            });
          }
          if (result.response?.headers) {
            reporterSkipHeaders.forEach((header) => {
              deleteHeaderIfExists(result.response.headers, header);
            });
          }
        });
      }

      // Handle bail option
      if (bail) {
        const requestFailure = result?.error && !result?.skipped;
        const testFailure = result?.testResults?.find((iter) => iter.status === 'fail');
        const assertionFailure = result?.assertionResults?.find((iter) => iter.status === 'fail');
        const preRequestTestFailure = result?.preRequestTestResults?.find((iter) => iter.status === 'fail');
        const postResponseTestFailure = result?.postResponseTestResults?.find((iter) => iter.status === 'fail');
        if (requestFailure || testFailure || assertionFailure || preRequestTestFailure || postResponseTestFailure) {
          break;
        }
      }

      // Handle flow control (next request)
      const nextRequestName = result?.nextRequestName;

      if (result?.shouldStopRunnerExecution) {
        break;
      }

      if (nextRequestName !== undefined) {
        nJumps++;
        if (nJumps > 10000) {
          throw new BrunoError(`Too many jumps, possible infinite loop`, constants.EXIT_STATUS.ERROR_INFINITE_LOOP);
        }
        if (nextRequestName === null) {
          break;
        }
        const nextRequestIdx = requestItems.findIndex((iter) => iter.name === nextRequestName);
        if (nextRequestIdx >= 0) {
          currentRequestIndex = nextRequestIdx;
        } else {
          throw new BrunoError("Could not find request with name '" + nextRequestName + "'", constants.EXIT_STATUS.ERROR_GENERIC);
        }
      } else {
        currentRequestIndex++;
      }
    }

    // Generate summary
    const summary = getRunnerSummary(results);
    const totalTime = results.reduce((acc, res) => acc + res.response.responseTime, 0);

    // Handle report generation
    if (generateReports && Object.keys(generateReports).length > 0) {
      const outputJson = {
        summary,
        results
      };

      const reporters = {
        'json': (path) => fs.writeFileSync(path, JSON.stringify(outputJson, null, 2)),
        'junit': (path) => makeJUnitOutput(results, path),
        'html': (path) => makeHtmlOutput(outputJson, path),
      };

      for (const formatter of Object.keys(generateReports)) {
        const reportPath = generateReports[formatter];
        const reporter = reporters[formatter];

        // Skip formatters lacking an output path
        if (!reportPath || reportPath.length === 0) {
          continue;
        }

        const outputDir = path.dirname(reportPath);
        const outputDirExists = await exists(outputDir);
        if (!outputDirExists) {
          throw new BrunoError(`Output directory ${outputDir} does not exist`, constants.EXIT_STATUS.ERROR_MISSING_OUTPUT_DIR);
        }

        if (!reporter) {
          throw new BrunoError(`Reporter ${formatter} does not exist`, constants.EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT);
        }

        reporter(reportPath);
      }
    }

    return {
      summary,
      results,
      totalTime
    };

  } catch (err) {
    // If the error is already a BrunoError, preserve its exit code
    if (err instanceof BrunoError) {
      throw err;
    }
    // Otherwise, wrap it in a BrunoError with generic exit code
    throw new BrunoError(`Bruno Runner Error: ${err.message}`, constants.EXIT_STATUS.ERROR_GENERIC);
  }
};

/**
 * Backward compatible runCollection function
 * Run Bruno collection with the provided options (maintains original API)
 * @param {Object} options - Configuration options for the runner
 * @returns {Promise<Object>} Results object with summary and detailed results
 */
const runCollection = async (options = {}) => {
  return await runCollectionOriginal(options);
};

module.exports = {
  runCollection,
  BrunoRunner
};
