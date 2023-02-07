const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const { exists, isFile } = require('../utils/filesystem');
const { runSingleRequest } = require('../runner/run-single-request');
const { bruToEnvJson, getEnvVars } = require('../utils/bru');

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
      await runSingleRequest(filename, collectionPath, collectionVariables, envVars);
      console.log(chalk.green('\nDone!'));
    }
  } catch (err) {
    // console.error(err.message);
  }
};

module.exports = {
	command,
	desc,
	builder,
  handler
};
