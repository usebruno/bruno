const { execSync } = require('child_process');
const os = require('os');

const platform = os.platform();
const arch = os.arch();
const target = '23.3.3';

const command = `cd ./node_modules/isolated-vm && rm -rf prebuilds && mkdir prebuilds && npm run prebuild -- --platform=${platform} --arch=${arch} --target=${target} --runtime=electron`;

console.log(`Running command: ${command}`);
execSync(command, { stdio: 'inherit' });
