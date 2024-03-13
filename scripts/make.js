const os = require('os');
const fs = require('fs-extra');
const spawn = require('child_process').spawn;

/// Helper function
const log = (...args) => console.log('-> ', ...args);
const error = (...args) => console.log('!> ', ...args);

async function deleteFileIfExists(filePath) {
  try {
    const exists = await fs.pathExists(filePath);
    if (exists) {
      await fs.remove(filePath);
      log(`${filePath} has been successfully deleted.`);
    } else {
      log(`${filePath} does not exist.`);
    }
  } catch (err) {
    error(`Error while checking the existence of ${filePath}: ${err}`);
  }
}

async function copyFolderIfExists(srcPath, destPath) {
  try {
    const exists = await fs.pathExists(srcPath);
    if (exists) {
      await fs.copy(srcPath, destPath);
      log(`${srcPath} has been successfully copied.`);
    } else {
      log(`${srcPath} was not copied as it does not exist.`);
    }
  } catch (err) {
    error(`Error while checking the existence of ${srcPath}: ${err}`);
  }
}

/**
 * @param {String} command
 * @param {String[]} args
 * @returns {Promise<void>}
 */
async function execCommandWithOutput(command, args) {
  return new Promise(async (resolve, reject) => {
    const childProcess = spawn(command, args, {
      stdio: 'inherit',
      shell: true
    });
    childProcess.on('error', (error) => {
      reject(error);
    });
    childProcess.on('exit', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command exited with code ${code}.`));
      }
    });
  });
}

// This maps the os to electron-builder
function determineOs() {
  const platform = os.platform();
  switch (platform) {
    case 'win32':
      return 'win';
    case 'linux':
      return 'linux';
    case 'darwin':
      return 'macos';
  }

  throw new Error(`Could not determine OS for your platform: "${platform}"!`);
}

// This maps the arch to electron-builder
function determineArchitecture() {
  const platform = os.arch();
  switch (platform) {
    case 'x64':
    case 'ia32':
    case 'arm64':
      return platform;
    case 'arm':
      return 'armv71';
  }

  throw new Error(`Could not determine architecture for your architecture: "${platform}"!`);
}

/**
 * @param {String[]} args
 * @returns {Promise<number>}
 */
async function main(args) {
  log('Starting Bruno build');

  const os = determineOs();
  const arch = determineArchitecture();
  log(`Building for operating system: "${os}" and architecture: "${arch}"`);

  log('Clean up old build artifacts');
  await execCommandWithOutput('pnpm', ['run', 'clean']);

  log('Building packages');
  await execCommandWithOutput('pnpm', ['run', 'build']);
  // Copy the output of bruno-app into electron
  await fs.ensureDir('packages/bruno-electron/web');
  await copyFolderIfExists('packages/bruno-app/out', 'packages/bruno-electron/web');

  // Change paths in next
  const files = await fs.readdir('packages/bruno-electron/web');
  for (const file of files) {
    if (file.endsWith('.html')) {
      let content = await fs.readFile(`packages/bruno-electron/web/${file}`, 'utf8');
      content = content.replace(/\/_next\//g, '_next/');
      await fs.writeFile(`packages/bruno-electron/web/${file}`, content);
    }
  }

  // Run npm dist command
  log(`Building the Electron app for: ${os}/${arch}`);
  await execCommandWithOutput('pnpm', ['run', '--filter', 'bruno-lazer', 'dist', '--', `--${arch}`, `--${os}`]);
  log('Build complete');

  return 0;
}

main(process.argv)
  .then((code) => process.exit(code))
  .catch((e) => console.error('An error occurred during build', e) && process.exit(1));
