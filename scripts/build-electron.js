const os = require('os');
const fs = require('fs-extra');
const spawn = require('child_process').spawn;

function log(...args) {
  console.log('-> ', ...args);
}
function error(...args) {
  console.log('!> ', ...args);
}

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

async function removeSourceMapFiles(directory) {
  try {
    const files = await fs.readdir(directory);
    for (const file of files) {
      if (file.endsWith('.map')) {
        const filePath = path.join(directory, file);
        await fs.remove(filePath);
        log(`${filePath} has been successfully deleted.`);
      }
    }
  } catch (error) {
    error(`Error while deleting .map files: ${error}`);
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

/**
 * @param {String[]} args
 * @returns {Promise<number>}
 */
async function main(args) {
  let target = args[args.length - 1];
  if (!target) {
    // Auto detect target
    if (os.platform() === 'win32') {
      target = 'win';
    } else if (os.platform() === 'darwin') {
      target = 'mac';
    } else {
      target = 'linux';
    }
    log('Target automatically set to ', target);
  }

  log('Clean up old build artifacts');
  await deleteFileIfExists('packages/bruno-electron/web');
  await deleteFileIfExists('packages/bruno-app/out');

  log('Building web');
  await execCommandWithOutput('npm', ['run', 'build:web']);
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
  log(`Building the Electron app for target: ${target}`);
  await execCommandWithOutput('npm', ['run', `dist:${target}`, '--workspace=packages/bruno-electron']);
  log('Build complete');
  return 0;
}

main(process.argv)
  .then((code) => process.exit(code))
  .catch((e) => console.error('An error occurred during build', e) && process.exit(1));
