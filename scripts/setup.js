const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const icons = {
  clean: '🧹',
  delete: '🗑️',
  install: '📦',
  build: '🔨',
  success: '✅',
  error: '❌',
  working: '⚡'
};

const execCommand = (command, description) => {
  try {
    console.log(`\n${icons.working} ${description}...`);
    execSync(command, { stdio: 'inherit' });
    console.log(`${icons.success} ${description} completed`);
  } catch (error) {
    console.error(`${icons.error} ${description} failed`);
    throw error;
  }
};

function forceInstallPlatformDeps() {
  const deps = {
    darwin: ['@lydell/node-pty-darwin-arm64@1.1.0', '@lydell/node-pty-darwin-x64@1.1.0'],
    win32: ['@lydell/node-pty-win32-arm64@1.1.0', '@lydell/node-pty-win32-x64@1.1.0'],
    linux: ['@lydell/node-pty-linux-arm64@1.1.0', '@lydell/node-pty-linux-x64@1.1.0']
  };

  if (!deps[process.platform] || (Array.isArray(deps[process.platform]) && deps[process.platform].length === 0)) return;

  const toInstall = deps[process.platform];
  execCommand(
    `npm i --legacy-peer-deps --no-save --force ${toInstall.join(' ')}`,
    'Installing platform specific dependencies'
  );
}

async function setup() {
  try {
    // Clean up node_modules
    execCommand('npm run clean', 'Cleaning up node_modules');

    // Install dependencies
    execCommand('npm i --legacy-peer-deps', 'Installing dependencies');
    forceInstallPlatformDeps();

    // Build packages
    execCommand('npm run build:graphql-docs', 'Building graphql-docs');
    execCommand('npm run build:bruno-query', 'Building bruno-query');
    execCommand('npm run build:bruno-common', 'Building bruno-common');
    execCommand('npm run build:bruno-converters', 'Building bruno-converters');
    execCommand('npm run build:bruno-requests', 'Building bruno-requests');
    execCommand('npm run build:schema-types', 'Building schema-types');
    execCommand('npm run build:bruno-filestore', 'Building bruno-filestore');

    // Bundle JS sandbox libraries
    execCommand('npm run sandbox:bundle-libraries --workspace=packages/bruno-js', 'Bundling JS sandbox libraries');

    console.log(`\n${icons.success} Setup completed successfully!\n`);
  } catch (error) {
    console.error(`\n${icons.error} Setup failed:`);
    console.error(error);
    process.exit(1);
  }
}

setup().catch((error) => {
  console.error(error);
  process.exit(1);
});