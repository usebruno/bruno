const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const { exists, isFile } = require('../utils/filesystem');
const { runSingleRequest } = require('../runner/run-single-request');
const { bruToEnvJson, getEnvVars } = require('../utils/bru');
const { rpad } = require('../utils/common');

const command = 'run <filename>';
const desc = 'Run a request';

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
      const {
        assertionResults,
        testResults
      } = await runSingleRequest(filename, collectionPath, collectionVariables, envVars);

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
