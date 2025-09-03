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

async function setup() {
  try {
    // Clean up node_modules (if exists)
    console.log(`\n${icons.clean} Cleaning up node_modules directories...`);
    execCommand('find ./ -name "node_modules" -type d -exec rm -rf {} +', `${icons.delete} Removing node_modules`);

    // Install dependencies
    execCommand('npm i --legacy-peer-deps', 'Installing dependencies');

    // Build packages
    execCommand('npm run build:graphql-docs', 'Building graphql-docs');
    execCommand('npm run build:bruno-query', 'Building bruno-query');
    execCommand('npm run build:bruno-common', 'Building bruno-common');
    execCommand('npm run build:bruno-converters', 'Building bruno-converters');
    execCommand('npm run build:bruno-requests', 'Building bruno-requests');
    execCommand('npm run build:bruno-filestore', 'Building bruno-filestore');

    // Bundle JS sandbox libraries
    execCommand(
      'npm run sandbox:bundle-libraries --workspace=packages/bruno-js',
      'Bundling JS sandbox libraries'
    );

    console.log(`\n${icons.success} Setup completed successfully!\n`);
  } catch (error) {
    console.error(`\n${icons.error} Setup failed:`);
    console.error(error);
    process.exit(1);
  }
}

setup().catch(error => {
  console.error(error);
  process.exit(1);
});
