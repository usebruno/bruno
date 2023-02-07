const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const { exists, isFile, isDirectory } = require('../utils/filesystem');
const { runSingleRequest } = require('../runner/run-single-request');
const { bruToEnvJson, getEnvVars } = require('../utils/bru');
const { rpad } = require('../utils/common');
const { bruToJson } = require('../utils/bru');

const command = 'run <filename>';
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

  console.log("\n" + chalk.bold(assertSummary));
  console.log(chalk.bold(testSummary));
};

const builder = async (yargs) => {
  yargs
    .option('env', {
      describe: 'Environment variables',
      type: 'string',
    })
    .example('$0 run request.bru', 'Run a request')
    .example('$0 run request.bru --env local', 'Run a request with the environment set to local');
};

const handler = async function (argv) {
  try {
    const {
      filename,
      env
    } = argv;

    const pathExists = await exists(filename);
    if(!pathExists) {
      console.error(chalk.red(`File or directory ${filename} does not exist`));
      return;
    }

    // todo
    // right now, bru must be run from the root of the collection
    // will add support in the future to run it from anywhere inside the collection
    const collectionPath = process.cwd();
    const collectionVariables = {};

    let envVars = {};
    if(env) {
      const envFile = path.join(collectionPath, 'environments', `${env}.bru`);
      const envPathExists = await exists(envFile);

      if(!envPathExists) {
        console.error(chalk.red(`Environment file not found: `) + chalk.dim(`environments/${env}.bru`));
        return;
      }

      const envBruContent = fs.readFileSync(envFile, 'utf8');
      const envJson = bruToEnvJson(envBruContent);
      envVars = getEnvVars(envJson);
    }

    const _isFile = await isFile(filename);
    if(_isFile) {
      console.log(chalk.yellow('Running Request \n'));
      const bruContent = fs.readFileSync(filename, 'utf8');
      const bruJson = bruToJson(bruContent);
      const {
        assertionResults,
        testResults
      } = await runSingleRequest(filename, bruJson, collectionPath, collectionVariables, envVars);

      printRunSummary(assertionResults, testResults);
      console.log(chalk.dim(chalk.grey('Done.')));
    }

    const _isDirectory = await isDirectory(filename);
    if(_isDirectory) {
      console.log(chalk.yellow('Running Collection \n'));

      const files = fs.readdirSync(filename);
      const bruFiles = files.filter((file) => file.endsWith('.bru'));
      const bruJsons = [];
      for (const bruFile of bruFiles) {
        const bruFilepath = path.join(filename, bruFile)
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

      let assertionResults = [];
      let testResults = [];

      for (const iter of bruJsons) {
        const {
          bruFilepath,
          bruJson
        } = iter;
        const {
          assertionResults: _assertionResults,
          testResults: _testResults
        } = await runSingleRequest(bruFilepath, bruJson, collectionPath, collectionVariables, envVars);

        assertionResults = assertionResults.concat(_assertionResults);
        testResults = testResults.concat(_testResults);
      }

      printRunSummary(assertionResults, testResults);
      console.log(chalk.dim(chalk.grey('Ran all requests.')));
    }
  } catch (err) {
    console.log("Something went wrong");
    console.error(chalk.red(err.message));
  }
};

module.exports = {
	command,
	desc,
	builder,
  handler
};
