const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const { cloneDeep } = require('lodash');
const { isFile, isDirectory } = require('../utils/filesystem');
const { runSingleRequest } = require('./run-single-request');
const { bruToJson } = require('../utils/bru');
const { findItemInCollection, getAllRequestsInFolder } = require('../utils/collection');

const getJsSandboxRuntime = (sandbox) => {
  return sandbox === 'safe' ? 'quickjs' : 'vm2';
};

async function runTest(users, collection, envVars, processEnvVars, filename, sandbox, testsOnly, reporterSkipAllHeaders, reporterSkipHeaders, delay, bail, recursive) {
  const collectionPath = process.cwd();
  const { root: collectionRoot, brunoConfig } = collection;

  const _isFile = isFile(filename);

  const runtimeVariables = {};

  let results = [];

  let requestItems = [];

  if (_isFile) {
    if (users === 1) {
      console.log(chalk.yellow('Running Request \n'));
    }
    const bruContent = fs.readFileSync(filename, 'utf8');
    const requestItem = bruToJson(bruContent);
    requestItem.pathname = path.resolve(collectionPath, filename);
    requestItems.push(requestItem);
  }

  const _isDirectory = isDirectory(filename);
  if (_isDirectory) {
    if (users === 1) {
      if (!recursive) {
        console.log(chalk.yellow('Running Folder \n'));
      } else {
        console.log(chalk.yellow('Running Folder Recursively \n'));
      }
    }
    const resolvedFilepath = path.resolve(filename);
    if (resolvedFilepath === collectionPath) {
      requestItems = getAllRequestsInFolder(collection?.items, recursive);
    } else {
      const folderItem = findItemInCollection(collection, resolvedFilepath);
      if (folderItem) {
        requestItems = getAllRequestsInFolder(folderItem.items, recursive);
      }
    }

    if (testsOnly) {
      requestItems = requestItems.filter((iter) => {
        const requestHasTests = iter.request?.tests;
        const requestHasActiveAsserts = iter.request?.assertions.some((x) => x.enabled) || false;
        return requestHasTests || requestHasActiveAsserts;
      });
    }
  }

  const runtime = getJsSandboxRuntime(sandbox);

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
  }

  let currentRequestIndex = 0;
  let nJumps = 0; // count the number of jumps to avoid infinite loops
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

    const isLastRun = currentRequestIndex === requestItems.length - 1;
    const isValidDelay = !Number.isNaN(delay) && delay > 0;
    if (isValidDelay && !isLastRun) {
      console.log(chalk.yellow(`Waiting for ${delay}ms or ${(delay / 1000).toFixed(3)}s before next request.`));
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    if (Number.isNaN(delay) && !isLastRun) {
      console.log(chalk.red(`Ignoring delay because it's not a valid number.`));
    }

    results.push({
      ...result,
      runtime: process.hrtime(start)[0] + process.hrtime(start)[1] / 1e9,
      suitename: pathname.replace('.bru', '')
    });

    if (reporterSkipAllHeaders) {
      results.forEach((result) => {
        result.request.headers = {};
        result.response.headers = {};
      });
    }

    const deleteHeaderIfExists = (headers, header) => {
      if (headers && headers[header]) {
        delete headers[header];
      }
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


    // bail if option is set and there is a failure
    if (bail) {
      const requestFailure = result?.error && !result?.skipped;
      const testFailure = result?.testResults?.find((iter) => iter.status === 'fail');
      const assertionFailure = result?.assertionResults?.find((iter) => iter.status === 'fail');
      if (requestFailure || testFailure || assertionFailure) {
        break;
      }
    }

    // determine next request
    const nextRequestName = result?.nextRequestName;

    if (result?.shouldStopRunnerExecution) {
      break;
    }

    if (nextRequestName !== undefined) {
      nJumps++;
      if (nJumps > 10000) {
        console.error(chalk.red(`Too many jumps, possible infinite loop`));
        process.exit(constants.EXIT_STATUS.ERROR_INFINITE_LOOP);
      }
      if (nextRequestName === null) {
        break;
      }
      const nextRequestIdx = requestItems.findIndex((iter) => iter.name === nextRequestName);
      if (nextRequestIdx >= 0) {
        currentRequestIndex = nextRequestIdx;
      } else {
        console.error("Could not find request with name '" + nextRequestName + "'");
        currentRequestIndex++;
      }
    } else {
      currentRequestIndex++;
    }
  }

  return results;
}

module.exports = {
  runTest
};
