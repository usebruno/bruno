const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const { forOwn } = require('lodash');
const { exists, isFile, isDirectory } = require('../utils/filesystem');
const { runSingleRequest } = require('../runner/run-single-request');
const { bruToEnvJson, getEnvVars } = require('../utils/bru');
const makeJUnitOutput = require('../reporters/junit');
const makeHtmlOutput = require('../reporters/html');
const { rpad } = require('../utils/common');
const { bruToJson, getOptions, collectionBruToJson } = require('../utils/bru');
const { dotenvToJson } = require('@usebruno/lang');
const constants = require('../constants');
const command = 'run [filename]';
const desc = 'Run a request';

const printRunSummary = (results) => {
  let totalRequests = 0;
  let passedRequests = 0;
  let failedRequests = 0;
  let totalAssertions = 0;
  let passedAssertions = 0;
  let failedAssertions = 0;
  let totalTests = 0;
  let passedTests = 0;
  let failedTests = 0;

  for (const result of results) {
    totalRequests += 1;
    totalTests += result.testResults.length;
    totalAssertions += result.assertionResults.length;
    let anyFailed = false;
    let hasAnyTestsOrAssertions = false;
    for (const testResult of result.testResults) {
      hasAnyTestsOrAssertions = true;
      if (testResult.status === 'pass') {
        passedTests += 1;
      } else {
        anyFailed = true;
        failedTests += 1;
      }
    }
    for (const assertionResult of result.assertionResults) {
      hasAnyTestsOrAssertions = true;
      if (assertionResult.status === 'pass') {
        passedAssertions += 1;
      } else {
        anyFailed = true;
        failedAssertions += 1;
      }
    }
    if (!hasAnyTestsOrAssertions && result.error) {
      failedRequests += 1;
    } else {
      passedRequests += 1;
    }
  }

  const maxLength = 12;

  let requestSummary = `${rpad('Requests:', maxLength)} ${chalk.green(`${passedRequests} passed`)}`;
  if (failedRequests > 0) {
    requestSummary += `, ${chalk.red(`${failedRequests} failed`)}`;
  }
  requestSummary += `, ${totalRequests} total`;

  let assertSummary = `${rpad('Tests:', maxLength)} ${chalk.green(`${passedTests} passed`)}`;
  if (failedTests > 0) {
    assertSummary += `, ${chalk.red(`${failedTests} failed`)}`;
  }
  assertSummary += `, ${totalTests} total`;

  let testSummary = `${rpad('Assertions:', maxLength)} ${chalk.green(`${passedAssertions} passed`)}`;
  if (failedAssertions > 0) {
    testSummary += `, ${chalk.red(`${failedAssertions} failed`)}`;
  }
  testSummary += `, ${totalAssertions} total`;

  console.log('\n' + chalk.bold(requestSummary));
  console.log(chalk.bold(assertSummary));
  console.log(chalk.bold(testSummary));

  return {
    totalRequests,
    passedRequests,
    failedRequests,
    totalAssertions,
    passedAssertions,
    failedAssertions,
    totalTests,
    passedTests,
    failedTests
  };
};

const getBruFilesRecursively = (dir, testsOnly) => {
  const environmentsPath = 'environments';

  const getFilesInOrder = (dir) => {
    let bruJsons = [];

    const traverse = (currentPath) => {
      const filesInCurrentDir = fs.readdirSync(currentPath);

      if (currentPath.includes('node_modules')) {
        return;
      }

      for (const file of filesInCurrentDir) {
        const filePath = path.join(currentPath, file);
        const stats = fs.lstatSync(filePath);

        // todo: we might need a ignore config inside bruno.json
        if (
          stats.isDirectory() &&
          filePath !== environmentsPath &&
          !filePath.startsWith('.git') &&
          !filePath.startsWith('node_modules')
        ) {
          traverse(filePath);
        }
      }

      const currentDirBruJsons = [];
      for (const file of filesInCurrentDir) {
        if (['collection.bru', 'folder.bru'].includes(file)) {
          continue;
        }
        const filePath = path.join(currentPath, file);
        const stats = fs.lstatSync(filePath);

        if (!stats.isDirectory() && path.extname(filePath) === '.bru') {
          const bruContent = fs.readFileSync(filePath, 'utf8');
          const bruJson = bruToJson(bruContent);
          const requestHasTests = bruJson.request?.tests;
          const requestHasActiveAsserts = bruJson.request?.assertions.some((x) => x.enabled) || false;

          if (testsOnly) {
            if (requestHasTests || requestHasActiveAsserts) {
              currentDirBruJsons.push({
                bruFilepath: filePath,
                bruJson
              });
            }
          } else {
            currentDirBruJsons.push({
              bruFilepath: filePath,
              bruJson
            });
          }
        }
      }

      // order requests by sequence
      currentDirBruJsons.sort((a, b) => {
        const aSequence = a.bruJson.seq || 0;
        const bSequence = b.bruJson.seq || 0;
        return aSequence - bSequence;
      });

      bruJsons = bruJsons.concat(currentDirBruJsons);
    };

    traverse(dir);
    return bruJsons;
  };

  return getFilesInOrder(dir);
};

const getCollectionRoot = (dir) => {
  const collectionRootPath = path.join(dir, 'collection.bru');
  const exists = fs.existsSync(collectionRootPath);
  if (!exists) {
    return {};
  }

  const content = fs.readFileSync(collectionRootPath, 'utf8');
  return collectionBruToJson(content);
};

const getFolderRoot = (dir) => {
  const folderRootPath = path.join(dir, 'folder.bru');
  const exists = fs.existsSync(folderRootPath);
  if (!exists) {
    return {};
  }

  const content = fs.readFileSync(folderRootPath, 'utf8');
  return collectionBruToJson(content);
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
    .option('env', {
      describe: 'Environment variables',
      type: 'string'
    })
    .option('env-var', {
      describe: 'Overwrite a single environment variable, multiple usages possible',
      type: 'string'
    })
    .option('sandbox', {
      describe: 'Javscript sandbox to use; available sandboxes are "developer" (default) or "safe"',
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
    .example('$0 run request.bru', 'Run a request')
    .example('$0 run request.bru --env local', 'Run a request with the environment set to local')
    .example('$0 run folder', 'Run all requests in a folder')
    .example('$0 run folder -r', 'Run all requests in a folder recursively')
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
    );
};

const handler = async function (argv) {
  try {
    let {
      filename,
      cacert,
      ignoreTruststore,
      env,
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
      bail
    } = argv;
    const collectionPath = process.cwd();

    // todo
    // right now, bru must be run from the root of the collection
    // will add support in the future to run it from anywhere inside the collection
    const brunoJsonPath = path.join(collectionPath, 'bruno.json');
    const brunoJsonExists = await exists(brunoJsonPath);
    if (!brunoJsonExists) {
      console.error(chalk.red(`You can run only at the root of a collection`));
      process.exit(constants.EXIT_STATUS.ERROR_NOT_IN_COLLECTION);
    }

    const brunoConfigFile = fs.readFileSync(brunoJsonPath, 'utf8');
    const brunoConfig = JSON.parse(brunoConfigFile);
    const collectionRoot = getCollectionRoot(collectionPath);

    if (filename && filename.length) {
      const pathExists = await exists(filename);
      if (!pathExists) {
        console.error(chalk.red(`File or directory ${filename} does not exist`));
        process.exit(constants.EXIT_STATUS.ERROR_FILE_NOT_FOUND);
      }
    } else {
      filename = './';
      recursive = true;
    }

    const runtimeVariables = {};
    let envVars = {};

    if (env) {
      const envFile = path.join(collectionPath, 'environments', `${env}.bru`);
      const envPathExists = await exists(envFile);

      if (!envPathExists) {
        console.error(chalk.red(`Environment file not found: `) + chalk.dim(`environments/${env}.bru`));
        process.exit(constants.EXIT_STATUS.ERROR_ENV_NOT_FOUND);
      }

      const envBruContent = fs.readFileSync(envFile, 'utf8');
      const envJson = bruToEnvJson(envBruContent);
      envVars = getEnvVars(envJson);
      envVars.__name__ = env;
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

    const _isFile = isFile(filename);
    let results = [];

    let bruJsons = [];

    if (_isFile) {
      console.log(chalk.yellow('Running Request \n'));
      const bruContent = fs.readFileSync(filename, 'utf8');
      const bruJson = bruToJson(bruContent);
      bruJsons.push({
        bruFilepath: filename,
        bruJson
      });
    }

    const _isDirectory = isDirectory(filename);
    if (_isDirectory) {
      if (!recursive) {
        console.log(chalk.yellow('Running Folder \n'));
        const files = fs.readdirSync(filename);
        const bruFiles = files.filter((file) => !['folder.bru'].includes(file) && file.endsWith('.bru'));

        for (const bruFile of bruFiles) {
          const bruFilepath = path.join(filename, bruFile);
          const bruContent = fs.readFileSync(bruFilepath, 'utf8');
          const bruJson = bruToJson(bruContent);
          const requestHasTests = bruJson.request?.tests;
          const requestHasActiveAsserts = bruJson.request?.assertions.some((x) => x.enabled) || false;
          if (testsOnly) {
            if (requestHasTests || requestHasActiveAsserts) {
              bruJsons.push({
                bruFilepath,
                bruJson
              });
            }
          } else {
            bruJsons.push({
              bruFilepath,
              bruJson
            });
          }
        }
        bruJsons.sort((a, b) => {
          const aSequence = a.bruJson.seq || 0;
          const bSequence = b.bruJson.seq || 0;
          return aSequence - bSequence;
        });
      } else {
        console.log(chalk.yellow('Running Folder Recursively \n'));

        bruJsons = getBruFilesRecursively(filename, testsOnly);
      }
    }

    const runtime = getJsSandboxRuntime(sandbox);
    let currentRequestIndex = 0;
    let nJumps = 0; // count the number of jumps to avoid infinite loops
    while (currentRequestIndex < bruJsons.length) {
      const iter = bruJsons[currentRequestIndex];
      const { bruFilepath, bruJson } = iter;

      const start = process.hrtime();
      const result = await runSingleRequest(
        bruFilepath,
        bruJson,
        collectionPath,
        runtimeVariables,
        envVars,
        processEnvVars,
        brunoConfig,
        collectionRoot,
        runtime
      );

      results.push({
        ...result,
        runtime: process.hrtime(start)[0] + process.hrtime(start)[1] / 1e9,
        suitename: bruFilepath.replace('.bru', '')
      });

      // bail if option is set and there is a failure
      if (bail) {
        const requestFailure = result?.error;
        const testFailure = result?.testResults?.find((iter) => iter.status === 'fail');
        const assertionFailure = result?.assertionResults?.find((iter) => iter.status === 'fail');
        if (requestFailure || testFailure || assertionFailure) {
          break;
        }
      }

      // determine next request
      const nextRequestName = result?.nextRequestName;
      if (nextRequestName !== undefined) {
        nJumps++;
        if (nJumps > 10000) {
          console.error(chalk.red(`Too many jumps, possible infinite loop`));
          process.exit(constants.EXIT_STATUS.ERROR_INFINTE_LOOP);
        }
        if (nextRequestName === null) {
          break;
        }
        const nextRequestIdx = bruJsons.findIndex((iter) => iter.bruJson.name === nextRequestName);
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

    if (summary.failedAssertions + summary.failedTests + summary.failedRequests > 0) {
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
