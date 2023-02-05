const chalk = require('chalk');
const {
  exists,
  isFile,
  isDirectory
} = require('../utils/filesystem');
const {
  runSingleRequest
} = require('../runner/run-single-request');
const {
  CLI_EPILOGUE,
} = require('../constants');

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

    const _isFile = await isFile(filename);
    if(_isFile) {
      runSingleRequest(filename);
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
