const chalk = require('chalk');
const {
  CLI_EPILOGUE,
} = require('../constants');

const command = 'run';
const desc = 'Run a request';

const cmdArgs = {
  filename: {
    desc: 'Run a request',
    type: 'string',
  }
};


const builder = async (yargs) => {
  yargs.options(cmdArgs).epilogue(CLI_EPILOGUE).help();
  yargs.example('$0 filename', 'Run a request');
};

const handler = async function (argv) {
  try {
    if (!argv.filename) {
      console.log(chalk.cyan('Please specify a filename'));
      console.log(`Example: ${argv.$0} run request.bru`);

      return;
    }
    console.log("here");
  } catch (err) {
    console.error(err);
  }
};


module.exports = {
	command,
	desc,
	builder,
  cmdArgs,
  handler
};
