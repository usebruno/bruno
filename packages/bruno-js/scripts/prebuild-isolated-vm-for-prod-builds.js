const { execSync } = require('child_process');

const darwin_x64 = `cd ./node_modules/isolated-vm && npm run prebuild -- --platform=darwin --arch=x64 --target=21.1.1 --runtime=electron`;
const darwin_arm64 = `cd ./node_modules/isolated-vm && npm run prebuild -- --platform=darwin --arch=arm64 --target=21.1.1 --runtime=electron`;
const linux_x64 = `cd ./node_modules/isolated-vm && npm run prebuild -- --platform=linux --arch=x64 --target=21.1.1 --runtime=electron`;
const linux_arm64 = `cd ./node_modules/isolated-vm && npm run prebuild -- --platform=linux --arch=arm64 --target=21.1.1 --runtime=electron`;
const win32_x64 = `cd ./node_modules/isolated-vm && npm run prebuild -- --platform=win32 --arch=x64 --target=21.1.1 --runtime=electron`;
const win32_arm64 = `cd ./node_modules/isolated-vm && npm run prebuild -- --platform=win32 --arch=arm64 --target=21.1.1 --runtime=electron`;

console.log(`Running command: ${darwin_x64}`);
execSync(darwin_x64, { stdio: 'inherit' });
console.log(`Running command: ${darwin_arm64}`);
execSync(darwin_arm64, { stdio: 'inherit' });
console.log(`Running command: ${linux_x64}`);
execSync(linux_x64, { stdio: 'inherit' });
console.log(`Running command: ${linux_arm64}`);
execSync(linux_arm64, { stdio: 'inherit' });
console.log(`Running command: ${win32_x64}`);
execSync(win32_x64, { stdio: 'inherit' });
console.log(`Running command: ${win32_arm64}`);
execSync(win32_arm64, { stdio: 'inherit' });
