const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const { forOwn, cloneDeep } = require('lodash');
const { getRunnerSummary } = require('@usebruno/common/runner');
const { exists, isFile, isDirectory } = require('../utils/filesystem');
const { runSingleRequest } = require('../runner/run-single-request');
const { bruToEnvJson, getEnvVars } = require('../utils/bru');
const makeJUnitOutput = require('../reporters/junit');
const makeHtmlOutput = require('../reporters/html');
const { rpad } = require('../utils/common');
const { bruToJson, getOptions, collectionBruToJson } = require('../utils/bru');
const { dotenvToJson } = require('@usebruno/lang');
const constants = require('../constants');
const { findItemInCollection, getAllRequestsInFolder, createCollectionJsonFromPathname, getCallStack } = require('../utils/collection');
const command = 'run [paths...]';
const desc = 'Run one or more requests/folders';

const formatTestSummary = (label, maxLength, passed, failed, total, errorCount = 0, skippedCount = 0) => {
  const parts = [
    `${rpad(label, maxLength)} ${chalk.green(`${passed} passed`)}`
  ];

  if (failed > 0) parts.push(chalk.red(`${failed} failed`));
  if (errorCount > 0) parts.push(chalk.red(`${errorCount} error`));
  if (skippedCount > 0) parts.push(chalk.magenta(`${skippedCount} skipped`));

  parts.push(`${total} total`);

  return parts.join(', ');
};

const printRunSummary = (results) => {
  const {
    totalRequests,
    passedRequests,
    failedRequests,
    skippedRequests,
    errorRequests,
    totalAssertions,
    passedAssertions,
    failedAssertions,
    totalTests,
    passedTests,
    failedTests,
    totalPreRequestTests,
    passedPreRequestTests,
    failedPreRequestTests,
    totalPostResponseTests,
    passedPostResponseTests,
    failedPostResponseTests
  } = getRunnerSummary(results);

  const maxLength = 12;

  const requestSummary = formatTestSummary('Requests:', maxLength, passedRequests, failedRequests, totalRequests, errorRequests, skippedRequests);
  const testSummary = formatTestSummary('Tests:', maxLength, passedTests, failedTests, totalTests);
  const assertSummary = formatTestSummary('Assertions:', maxLength, passedAssertions, failedAssertions, totalAssertions);

  let preRequestTestSummary = '';
  if (totalPreRequestTests > 0) {
    preRequestTestSummary = formatTestSummary('Pre-Request Tests:', maxLength, passedPreRequestTests, failedPreRequestTests, totalPreRequestTests);
  }

  let postResponseTestSummary = '';
  if (totalPostResponseTests > 0) {
    postResponseTestSummary = formatTestSummary('Post-Response Tests:', maxLength, passedPostResponseTests, failedPostResponseTests, totalPostResponseTests);
  }

  console.log('\n' + chalk.bold(requestSummary));
  if (preRequestTestSummary) {
    console.log(chalk.bold(preRequestTestSummary));
  }
  if (postResponseTestSummary) {
    console.log(chalk.bold(postResponseTestSummary));
  }
  console.log(chalk.bold(testSummary));
  console.log(chalk.bold(assertSummary));

  return {
    totalRequests,
    passedRequests,
    failedRequests,
    skippedRequests,
    errorRequests,
    totalAssertions,
    passedAssertions,
    failedAssertions,
    totalTests,
    passedTests,
    failedTests,
    totalPreRequestTests,
    passedPreRequestTests,
    failedPreRequestTests,
    totalPostResponseTests,
    passedPostResponseTests,
    failedPostResponseTests
  }
};

const getJsSandboxRuntime = (sandbox) => {
  return sandbox === 'safe' ? 'quickjs' : 'vm2';
};

const builder = async (yargs) => {
  yargs
    .option('r', {
      describe: 'Indicates a recursive run',
      type: 'boolean',
      default: false
    })
    .option('cacert', {
      type: 'string',
      description: 'CA certificate to verify peer against'
    })
    .option('ignore-truststore', {
      type: 'boolean',
      default: false,
      description:
        'The specified custom CA certificate (--cacert) will be used exclusively and the default truststore is ignored, if this option is specified. Evaluated in combination with "--cacert" only.'
    })
    .option('disable-cookies', {
      type: 'boolean',
      default: false,
      description: 'Automatically save and sent cookies with requests'
    })
    .option('env', {
      describe: 'Environment variables',
      type: 'string'
    })
    .option('env-file', {
      describe: 'Path to environment file (.bru) - can be absolute or relative path',
      type: 'string'
    })
    .option('env-var', {
      describe: 'Overwrite a single environment variable, multiple usages possible',
      type: 'string'
    })
    .option('sandbox', {
      describe: 'Javascript sandbox to use; available sandboxes are "developer" (default) or "safe"',
      default: 'developer',
      type: 'string'
    })
    .option('output', {
      alias: 'o',
      describe: 'Path to write file results to',
      type: 'string'
    })
    .option('format', {
      alias: 'f',
      describe: 'Format of the file results; available formats are "json" (default), "junit" or "html"',
      default: 'json',
      type: 'string'
    })
    .option('reporter-json', {
      describe: 'Path to write json file results to',
      type: 'string'
    })
    .option('reporter-junit', {
      describe: 'Path to write junit file results to',
      type: 'string'
    })
    .option('reporter-html', {
      describe: 'Path to write html file results to',
      type: 'string'
    })
    .option('insecure', {
      type: 'boolean',
      description: 'Allow insecure server connections'
    })
    .option('tests-only', {
      type: 'boolean',
      description: 'Only run requests that have a test or active assertion'
    })
    .option('bail', {
      type: 'boolean',
      description: 'Stop execution after a failure of a request, test, or assertion'
    })
    .option('reporter-skip-all-headers', {
      type: 'boolean',
      description: 'Omit headers from the reporter output',
      default: false
    })
    .option('reporter-skip-headers', {
      type: 'array',
      description: 'Skip specific headers from the reporter output',
      default: []
    })
    .option('client-cert-config', {
      type: 'string',
      description: 'Path to the Client certificate config file used for securing the connection in the request'
    })
    .option('--noproxy', {
      type: 'boolean',
      description: 'Disable all proxy settings (both collection-defined and system proxies)',
      default: false
    })
    .option('delay', {
      type:"number",
      description: "Delay between each requests (in miliseconds)"
    })
    .example('$0 run request.bru', 'Run a request')
    .example('$0 run request.bru --env local', 'Run a request with the environment set to local')
    .example('$0 run request.bru --env-file env.bru', 'Run a request with the environment from env.bru file')
    .example('$0 run folder', 'Run all requests in a folder')
    .example('$0 run folder -r', 'Run all requests in a folder recursively')
    .example('$0 run request.bru folder', 'Run a request and all requests in a folder')
    .example('$0 run --reporter-skip-all-headers', 'Run all requests in a folder recursively with omitted headers from the reporter output')
    .example(
      '$0 run --reporter-skip-headers "Authorization"',
      'Run all requests in a folder recursively with skipped headers from the reporter output'
    )
    .example(
      '$0 run request.bru --env local --env-var secret=xxx',
      'Run a request with the environment set to local and overwrite the variable secret with value xxx'
    )
    .example(
      '$0 run request.bru --output results.json',
      'Run a request and write the results to results.json in the current directory'
    )
    .example(
      '$0 run request.bru --output results.xml --format junit',
      'Run a request and write the results to results.xml in junit format in the current directory'
    )
    .example(
      '$0 run request.bru --output results.html --format html',
      'Run a request and write the results to results.html in html format in the current directory'
    )
    .example(
      '$0 run request.bru --reporter-junit results.xml --reporter-html results.html',
      'Run a request and write the results to results.html in html format and results.xml in junit format in the current directory'
    )
    .example('$0 run request.bru --tests-only', 'Run all requests that have a test')
    .example(
      '$0 run request.bru --cacert myCustomCA.pem',
      'Use a custom CA certificate in combination with the default truststore when validating the peer of this request.'
    )
    .example(
      '$0 run folder --cacert myCustomCA.pem --ignore-truststore',
      'Use a custom CA certificate exclusively when validating the peers of the requests in the specified folder.'
    )
    .example('$0 run --client-cert-config client-cert-config.json', 'Run a request with Client certificate configurations')
    .example('$0 run folder --delay delayInMs', 'Run a folder with given miliseconds delay between each requests.')
    .example('$0 run --noproxy', 'Run requests with system proxy disabled');
};

const handler = async function (argv) {
  try {
    let {
      paths,
      cacert,
      ignoreTruststore,
      disableCookies,
      env,
      envFile,
      envVar,
      insecure,
      r: recursive,
      output: outputPath,
      format,
      reporterJson,
      reporterJunit,
      reporterHtml,
      sandbox,
      testsOnly,
      bail,
      reporterSkipAllHeaders,
      reporterSkipHeaders,
      clientCertConfig,
      noproxy,
      delay
    } = argv;
    const collectionPath = process.cwd();

    let collection = createCollectionJsonFromPathname(collectionPath);
    const { root: collectionRoot, brunoConfig } = collection;

    if (clientCertConfig) {
      try {
        const clientCertConfigExists = await exists(clientCertConfig);
        if (!clientCertConfigExists) {
          console.error(chalk.red(`Client Certificate Config file "${clientCertConfig}" does not exist.`));
          process.exit(constants.EXIT_STATUS.ERROR_FILE_NOT_FOUND);
        }

        const clientCertConfigFileContent = fs.readFileSync(clientCertConfig, 'utf8');
        let clientCertConfigJson;

        try {
          clientCertConfigJson = JSON.parse(clientCertConfigFileContent);
        } catch (err) {
          console.error(chalk.red(`Failed to parse Client Certificate Config JSON: ${err.message}`));
          process.exit(constants.EXIT_STATUS.ERROR_INVALID_JSON);
        }

        if (clientCertConfigJson?.enabled && Array.isArray(clientCertConfigJson?.certs)) {
          if (brunoConfig.clientCertificates) {
            brunoConfig.clientCertificates.certs.push(...clientCertConfigJson.certs);
          } else {
            brunoConfig.clientCertificates = { certs: clientCertConfigJson.certs };
          }
          console.log(chalk.green(`Client certificates has been added`));
        } else {
          console.warn(chalk.yellow(`Client certificate configuration is enabled, but it either contains no valid "certs" array or the added configuration has been set to false`));
        }
      } catch (err) {
        console.error(chalk.red(`Unexpected error: ${err.message}`));
        process.exit(constants.EXIT_STATUS.ERROR_UNKNOWN);
      }
    }

    const runtimeVariables = {};
    let envVars = {};

    if (env && envFile) {
      console.error(chalk.red(`Cannot use both --env and --env-file options together`));
      process.exit(constants.EXIT_STATUS.ERROR_MALFORMED_ENV_OVERRIDE);
    }

    if (envFile || env) {
      const envFilePath = envFile
        ? path.resolve(collectionPath, envFile)
        : path.join(collectionPath, 'environments', `${env}.bru`);

      const envFileExists = await exists(envFilePath);
      if (!envFileExists) {
        const errorPath = envFile || `environments/${env}.bru`;
        console.error(chalk.red(`Environment file not found: `) + chalk.dim(errorPath));

        process.exit(constants.EXIT_STATUS.ERROR_ENV_NOT_FOUND);
      }

      const envBruContent = fs.readFileSync(envFilePath, 'utf8').replace(/\r\n/g, '\n');
      const envJson = bruToEnvJson(envBruContent);
      envVars = getEnvVars(envJson);
      envVars.__name__ = envFile ? path.basename(envFilePath, '.bru') : env;
    }

    if (envVar) {
      let processVars;
      if (typeof envVar === 'string') {
        processVars = [envVar];
      } else if (typeof envVar === 'object' && Array.isArray(envVar)) {
        processVars = envVar;
      } else {
        console.error(chalk.red(`overridable environment variables not parsable: use name=value`));
        process.exit(constants.EXIT_STATUS.ERROR_MALFORMED_ENV_OVERRIDE);
      }
      if (processVars && Array.isArray(processVars)) {
        for (const value of processVars.values()) {
          // split the string at the first equals sign
          const match = value.match(/^([^=]+)=(.*)$/);
          if (!match) {
            console.error(
              chalk.red(`Overridable environment variable not correct: use name=value - presented: `) +
                chalk.dim(`${value}`)
            );
            process.exit(constants.EXIT_STATUS.ERROR_INCORRECT_ENV_OVERRIDE);
          }
          envVars[match[1]] = match[2];
        }
      }
    }

    const options = getOptions();
    if (bail) {
      options['bail'] = true;
    }
    if (insecure) {
      options['insecure'] = true;
    }
    if (disableCookies) {
      options['disableCookies'] = true;
    }
    if (noproxy) {
      options['noproxy'] = true;
    }
    if (cacert && cacert.length) {
      if (insecure) {
        console.error(chalk.red(`Ignoring the cacert option since insecure connections are enabled`));
      } else {
        const pathExists = await exists(cacert);
        if (pathExists) {
          options['cacert'] = cacert;
        } else {
          console.error(chalk.red(`Cacert File ${cacert} does not exist`));
        }
      }
    }
    options['ignoreTruststore'] = ignoreTruststore;

    if (['json', 'junit', 'html'].indexOf(format) === -1) {
      console.error(chalk.red(`Format must be one of "json", "junit or "html"`));
      process.exit(constants.EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT);
    }

    let formats = {};

    // Maintains back compat with --format and --output
    if (outputPath && outputPath.length) {
      formats[format] = outputPath;
    }

    if (reporterHtml && reporterHtml.length) {
      formats['html'] = reporterHtml;
    }

    if (reporterJson && reporterJson.length) {
      formats['json'] = reporterJson;
    }

    if (reporterJunit && reporterJunit.length) {
      formats['junit'] = reporterJunit;
    }

    // load .env file at root of collection if it exists
    const dotEnvPath = path.join(collectionPath, '.env');
    const dotEnvExists = await exists(dotEnvPath);
    const processEnvVars = {
      ...process.env
    };
    if (dotEnvExists) {
      const content = fs.readFileSync(dotEnvPath, 'utf8');
      const jsonData = dotenvToJson(content);

      forOwn(jsonData, (value, key) => {
        processEnvVars[key] = value;
      });
    }

    let requestItems = [];
    let results = [];

    if (!paths || !paths.length) {
      paths = ['./'];
      recursive = true;
    }

    const resolvedPaths = paths.map(p => path.resolve(process.cwd(), p));

    for (const resolvedPath of resolvedPaths) {
      const pathExists = await exists(resolvedPath);
      if (!pathExists) {
        console.error(chalk.red(`Path not found: ${resolvedPath}`));
        process.exit(constants.EXIT_STATUS.ERROR_FILE_NOT_FOUND);
      }
    }

    requestItems = getCallStack(resolvedPaths, collection, { recursive });

    if (testsOnly) {
      requestItems = requestItems.filter((iter) => {
        const requestHasTests = iter.request?.tests;
        const requestHasActiveAsserts = iter.request?.assertions.some((x) => x.enabled) || false;
        return requestHasTests || requestHasActiveAsserts;
      });
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
      if(isValidDelay && !isLastRun){
        console.log(chalk.yellow(`Waiting for ${delay}ms or ${(delay/1000).toFixed(3)}s before next request.`));
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      if(Number.isNaN(delay) && !isLastRun){
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
        const preRequestTestFailure = result?.preRequestTestResults?.find((iter) => iter.status === 'fail');
        const postResponseTestFailure = result?.postResponseTestResults?.find((iter) => iter.status === 'fail');
        if (requestFailure || testFailure || assertionFailure || preRequestTestFailure || postResponseTestFailure) {
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

    const summary = printRunSummary(results);
    const totalTime = results.reduce((acc, res) => acc + res.response.responseTime, 0);
    console.log(chalk.dim(chalk.grey(`Ran all requests - ${totalTime} ms`)));

    const formatKeys = Object.keys(formats);
    if (formatKeys && formatKeys.length > 0) {
      const outputJson = {
        summary,
        results
      };

      const reporters = {
        'json': (path) => fs.writeFileSync(path, JSON.stringify(outputJson, null, 2)),
        'junit': (path) => makeJUnitOutput(results, path),
        'html': (path) => makeHtmlOutput(outputJson, path),
      }

      for (const formatter of Object.keys(formats))
      {
        const reportPath = formats[formatter];
        const reporter = reporters[formatter];

        // Skip formatters lacking an output path.
        if (!reportPath || reportPath.length === 0) {
          continue;
        }

        const outputDir = path.dirname(reportPath);
        const outputDirExists = await exists(outputDir);
        if (!outputDirExists) {
          console.error(chalk.red(`Output directory ${outputDir} does not exist`));
          process.exit(constants.EXIT_STATUS.ERROR_MISSING_OUTPUT_DIR);
        }

        if (!reporter) {
          console.error(chalk.red(`Reporter ${formatter} does not exist`));
          process.exit(constants.EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT);
        }

        reporter(reportPath);

        console.log(chalk.dim(chalk.grey(`Wrote ${formatter} results to ${reportPath}`)));
      }
    }

    if ((summary.failedAssertions + summary.failedTests + summary.failedPreRequestTests + summary.failedPostResponseTests + summary.failedRequests > 0) || (summary?.errorRequests > 0)) {
      process.exit(constants.EXIT_STATUS.ERROR_FAILED_COLLECTION);
    }
  } catch (err) {
    console.log('Something went wrong');
    console.error(chalk.red(err.message));
    process.exit(constants.EXIT_STATUS.ERROR_GENERIC);
  }
};

module.exports = {
  command,
  desc,
  builder,
  handler,
  printRunSummary
};
