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

const glob = function (startPath, pattern) {
  let results = [];

  // Ensure start path exists
  if (!fs.existsSync(startPath)) {
    return results;
  }

  const files = fs.readdirSync(startPath);
  for (const file of files) {
    const filename = path.join(startPath, file);
    const stat = fs.lstatSync(filename);

    // If directory, recurse into it
    if (stat.isDirectory()) {
      // Skip node_modules recursion to avoid unnecessary deep scanning
      if (file === 'node_modules') {
        if (file === pattern) {
          results.push(filename);
        }
        continue;
      }
      results = results.concat(glob(filename, pattern));
    }
    
    // If file matches pattern, add to results
    if (file === pattern) {
      results.push(filename);
    }
  }

  return results;
};

async function setup() {
  try {
    // Clean up node_modules (if exists)
    console.log(`\n${icons.clean} Cleaning up node_modules directories...`);
    const nodeModulesPaths = glob('.', 'node_modules');
    for (const dir of nodeModulesPaths) {
      console.log(`${icons.delete} Removing ${dir}`);
      fs.rmSync(dir, { recursive: true, force: true });
    }

    // Install dependencies
    execCommand('npm i --legacy-peer-deps', 'Installing dependencies');

    // Build packages
    execCommand('npm run build:graphql-docs', 'Building graphql-docs');
    execCommand('npm run build:bruno-query', 'Building bruno-query');
    execCommand('npm run build:bruno-common', 'Building bruno-common');

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
