// https://github.com/sindresorhus/pid-port
// common js util function for the above library

const { spawnSync } = require('node:child_process');
const process = require('node:process');

const runCommand = (command, args) => {
	const result = spawnSync(command, args, { encoding: 'utf-8' });
	if (result.error) {
		throw result.error;
	}
	return result.stdout || ''; // Handle undefined stdout
};

const netstat = type => runCommand('netstat', ['-anv', '-p', type]);

const macos = async () => {
	const result = [netstat('tcp'), netstat('udp')];
	const tcp = result[0] || '';
	const headerStart = tcp?.indexOf('\n') + 1;
	const header = tcp.slice(headerStart, tcp.indexOf('\n', headerStart)) || '';

	return {
		stdout: result.join('\n'),
		addressColumn: 3,
		pidColumn: header.includes('rxbytes') ? 10 : 8,
	};
};

const linux = async () => {
	const stdout = runCommand('ss', ['-tunlp']) || '';
	return { stdout, addressColumn: 4, pidColumn: 6 };
};

const windows = async () => {
	const stdout = runCommand('netstat', ['-ano']) || '';
	return { stdout, addressColumn: 1, pidColumn: 4 };
};

const isProtocol = value => /^\s*(tcp|udp)/i.test(value);

const parsePid = pid => {
	if (typeof pid !== 'string') {
		return;
	}

	const { groups } = /(?:^|",|",pid=)(?<pid>\d+)/.exec(pid) || {};
	return groups ? Number.parseInt(groups.pid, 10) : undefined;
};

const getPort = (port, { lines, addressColumn, pidColumn }) => {
	const regex = new RegExp(`[.:]${port}$`);
	const foundPort = lines.find(line => regex.test(line[addressColumn]));
	if (!foundPort) {
		return null;
	}
	return parsePid(foundPort[pidColumn]);
};

const implementation = process.platform === 'darwin' ? macos : (process.platform === 'linux' ? linux : windows);
const getList = async () => {
	const { stdout, addressColumn, pidColumn } = await implementation();
	const lines = (stdout || '').split('\n')
		.filter(line => isProtocol(line))
		.map(line => line.match(/\S+/g) || []);
	return { lines, addressColumn, pidColumn };
};

const portToPid = async port => {
	if (Array.isArray(port)) {
		const list = await getList();
		const tuples = await Promise.all(port.map(port_ => [port_, getPort(port_, list)]));
		return new Map(tuples);
	}

	if (!Number.isInteger(port)) {
		throw new TypeError(`Expected an integer, got ${typeof port}`);
	}

	return getPort(port, await getList());
};

module.exports = portToPid;
