const chalk = require('chalk');
const {
  exists,
  isFile,
  isDirectory
} = require('../utils/filesystem');
const {
  runSingleRequest
} = require('../runner/run-single-request');

const command = 'run <filename>';
const desc = 'Run a request';

const builder = async (yargs) => {
  yargs.example('$0 run request.bru', 'Run a request');
};

const handler = async function (argv) {
  try {
    const { filename } = argv;

    const pathExists = await exists(filename);
    if(!pathExists) {
      console.error(chalk.red(`File or directory ${filename} does not exist`));
    }

    // todo
    // right now, bru must be run from the root of the collection
    // will add support in the future to run it from anywhere inside the collection
    const collectionPath = process.cwd();
    const collectionVariables = {};

    const _isFile = await isFile(filename);
    if(_isFile) {
      console.log(chalk.yellow('Running Request \n'));
      await runSingleRequest(filename, collectionPath, collectionVariables);
      console.log(chalk.green('\nDone!'));
    }
  } catch (err) {
    console.error(err);
  }
};

module.exports = {
	command,
	desc,
	builder,
  handler
};
