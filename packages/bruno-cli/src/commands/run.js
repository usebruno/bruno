const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const { exists, isFile, isDirectory } = require('../utils/filesystem');
const { runSingleRequest } = require('../runner/run-single-request');
const { bruToEnvJson, getEnvVars } = require('../utils/bru');
const { rpad } = require('../utils/common');
const { bruToJson, getOptions } = require('../utils/bru');

const command = 'run [filename]';
const desc = 'Run a request';

const printRunSummary = (assertionResults, testResults) => {
  // display assertion results and test results summary
  const totalAssertions = assertionResults.length;
  const passedAssertions = assertionResults.filter((result) => result.status === 'pass').length;
  const failedAssertions = totalAssertions - passedAssertions;

  const totalTests = testResults.length;
  const passedTests = testResults.filter((result) => result.status === 'pass').length;
  const failedTests = totalTests - passedTests;
  const maxLength = 12;

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

  console.log('\n' + chalk.bold(assertSummary));
  console.log(chalk.bold(testSummary));

  return {
    totalAssertions,
    passedAssertions,
    failedAssertions,
    totalTests,
    passedTests,
    failedTests
  };
};

const getBruFilesRecursively = (dir) => {
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
        const filePath = path.join(currentPath, file);
        const stats = fs.lstatSync(filePath);

        if (!stats.isDirectory() && path.extname(filePath) === '.bru') {
          const bruContent = fs.readFileSync(filePath, 'utf8');
          const bruJson = bruToJson(bruContent);
          currentDirBruJsons.push({
            bruFilepath: filePath,
            bruJson
          });
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
    .option('env', {
      describe: 'Environment variables',
      type: 'string'
    })
    .option('env-var', {
      describe: 'Overwrite a single environment variable, multiple usages possible',
      type: 'string'
    })
    .option('insecure', {
      type: 'boolean',
      description: 'Allow insecure server connections'
    })
    .example('$0 run request.bru', 'Run a request')
    .example('$0 run request.bru --env local', 'Run a request with the environment set to local')
    .example('$0 run folder', 'Run all requests in a folder')
    .example('$0 run folder -r', 'Run all requests in a folder recursively')
    .example(
      '$0 run request.bru --env local --env-var secret=xxx',
      'Run a request with the environment set to local and overwrite the variable secret with value xxx'
    );
};

const handler = async function (argv) {
  try {
    let { filename, cacert, env, envVar, insecure, r: recursive } = argv;
    const collectionPath = process.cwd();

    // todo
    // right now, bru must be run from the root of the collection
    // will add support in the future to run it from anywhere inside the collection
    const brunoJsonPath = path.join(collectionPath, 'bruno.json');
    const brunoJsonExists = await exists(brunoJsonPath);
    if (!brunoJsonExists) {
      console.error(chalk.red(`You can run only at the root of a collection`));
      return;
    }

    if (filename && filename.length) {
      const pathExists = await exists(filename);
      if (!pathExists) {
        console.error(chalk.red(`File or directory ${filename} does not exist`));
        return;
      }
    } else {
      filename = './';
      recursive = true;
    }

    const collectionVariables = {};
    let envVars = {};

    if (env) {
      const envFile = path.join(collectionPath, 'environments', `${env}.bru`);
      const envPathExists = await exists(envFile);

      if (!envPathExists) {
        console.error(chalk.red(`Environment file not found: `) + chalk.dim(`environments/${env}.bru`));
        return;
      }

      const envBruContent = fs.readFileSync(envFile, 'utf8');
      const envJson = bruToEnvJson(envBruContent);
      envVars = getEnvVars(envJson);
    }

    if (envVar) {
      let processVars;
      if (typeof envVar === 'string') {
        processVars = [envVar];
      } else if (typeof envVar === 'object' && Array.isArray(envVar)) {
        processVars = envVar;
      } else {
        console.error(chalk.red(`overridable environment variables not parsable: use name=value`));
        return;
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
            return;
          }
          envVars[match[1]] = match[2];
        }
      }
    }

    const options = getOptions();
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

    const _isFile = await isFile(filename);
    if (_isFile) {
      console.log(chalk.yellow('Running Request \n'));
      const bruContent = fs.readFileSync(filename, 'utf8');
      const bruJson = bruToJson(bruContent);
      const result = await runSingleRequest(filename, bruJson, collectionPath, collectionVariables, envVars);

      if (result) {
        const { assertionResults, testResults } = result;

        const summary = printRunSummary(assertionResults, testResults);
        console.log(chalk.dim(chalk.grey('Done.')));

        if (summary.failedAssertions > 0 || summary.failedTests > 0) {
          process.exit(1);
        }
      } else {
        process.exit(1);
      }
    }

    const _isDirectory = await isDirectory(filename);
    if (_isDirectory) {
      let bruJsons = [];
      if (!recursive) {
        console.log(chalk.yellow('Running Folder \n'));
        const files = fs.readdirSync(filename);
        const bruFiles = files.filter((file) => file.endsWith('.bru'));

        for (const bruFile of bruFiles) {
          const bruFilepath = path.join(filename, bruFile);
          const bruContent = fs.readFileSync(bruFilepath, 'utf8');
          const bruJson = bruToJson(bruContent);
          bruJsons.push({
            bruFilepath,
            bruJson
          });
        }

        // order requests by sequence
        bruJsons.sort((a, b) => {
          const aSequence = a.bruJson.seq || 0;
          const bSequence = b.bruJson.seq || 0;
          return aSequence - bSequence;
        });
      } else {
        console.log(chalk.yellow('Running Folder Recursively \n'));

        bruJsons = getBruFilesRecursively(filename);
      }

      let assertionResults = [];
      let testResults = [];

      for (const iter of bruJsons) {
        const { bruFilepath, bruJson } = iter;
        const result = await runSingleRequest(bruFilepath, bruJson, collectionPath, collectionVariables, envVars);

        if (result) {
          const { assertionResults: _assertionResults, testResults: _testResults } = result;

          assertionResults = assertionResults.concat(_assertionResults);
          testResults = testResults.concat(_testResults);
        }
      }

      const summary = printRunSummary(assertionResults, testResults);
      console.log(chalk.dim(chalk.grey('Ran all requests.')));

      if (summary.failedAssertions > 0 || summary.failedTests > 0) {
        process.exit(1);
      }
    }
  } catch (err) {
    console.log('Something went wrong');
    console.error(chalk.red(err.message));
    process.exit(1);
  }
};

module.exports = {
  command,
  desc,
  builder,
  handler
};
