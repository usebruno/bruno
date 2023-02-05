const chalk = require('chalk');

const command = 'run';
const desc = 'Run request';

const builder = async (yargs) => {
	try {
		console.log(chalk.yellow('Running request'));
	} catch (err) {
		console.error(err);
	}
};

module.exports = {
	command,
	desc,
	builder
};
