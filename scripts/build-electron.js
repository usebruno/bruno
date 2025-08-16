const os = require('os');
const fs = require('fs-extra');
const util = require('util');
const spawn = util.promisify(require('child_process').spawn);
const path = require('path');

// Accept optional argument for special build modes, e.g. "winarm" to build Windows on ARM64 only
const buildMode = (process.argv[2] || '').toLowerCase();

async function deleteFileIfExists(filePath) {
  try {
    const exists = await fs.pathExists(filePath);
    if (exists) {
      await fs.remove(filePath);
      console.log(`${filePath} has been successfully deleted.`);
    } else {
      console.log(`${filePath} does not exist.`);
    }
  } catch (err) {
    console.error(`Error while checking the existence of ${filePath}: ${err}`);
  }
}

async function copyFolderIfExists(srcPath, destPath) {
  try {
    const exists = await fs.pathExists(srcPath);
    if (exists) {
      await fs.copy(srcPath, destPath);
      console.log(`${srcPath} has been successfully copied.`);
    } else {
      console.log(`${srcPath} was not copied as it does not exist.`);
    }
  } catch (err) {
    console.error(`Error while checking the existence of ${srcPath}: ${err}`);
  }
}

async function removeSourceMapFiles(directory) {
  try {
    const files = await fs.readdir(directory);
    for (const file of files) {
      if (file.endsWith('.map')) {
        const filePath = path.join(directory, file);
        await fs.remove(filePath);
        console.log(`${filePath} has been successfully deleted.`);
      }
    }
  } catch (error) {
    console.error(`Error while deleting .map files: ${error}`);
  }
}

async function execCommandWithOutput(command) {
  return new Promise(async (resolve, reject) => {
    const childProcess = await spawn(command, {
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

async function main() {
  try {
    // Remove out directory
    await deleteFileIfExists('packages/bruno-electron/out');

    // Remove web directory
    await deleteFileIfExists('packages/bruno-electron/web');

    // Create a new web directory
    await fs.ensureDir('packages/bruno-electron/web');
    console.log('The directory has been created successfully!');

    // Copy build
    await copyFolderIfExists('packages/bruno-app/dist', 'packages/bruno-electron/web');

    // Update static paths
    const files = await fs.readdir('packages/bruno-electron/web');
    for (const file of files) {
      if (file.endsWith('.html')) {
        let content = await fs.readFile(`packages/bruno-electron/web/${file}`, 'utf8');
        content = content.replace(/\/static/g, './static');
        await fs.writeFile(`packages/bruno-electron/web/${file}`, content);
      }
    }

    // update font load paths
    const cssDir = path.join('packages/bruno-electron/web/static/css');
    try {
      const cssFiles = await fs.readdir(cssDir);
      for (const file of cssFiles) {
        if (file.endsWith('.css')) {
          const filePath = path.join(cssDir, file);
          let content = await fs.readFile(filePath, 'utf8');
          content = content.replace(/\/static\/font/g, '../../static/font');
          await fs.writeFile(filePath, content);
        }
      }
    } catch (error) {
      console.error(`Error updating font paths: ${error}`);
    }

    // Remove sourcemaps
    await removeSourceMapFiles('packages/bruno-electron/web');

    // Run npm dist command
    console.log('Building the Electron distribution');

    // Special handling for Windows on ARM build request
    if (os.platform() === 'win32' && ['winarm', 'arm', 'arm64'].includes(buildMode)) {
      console.log('Executing Windows on ARM64 build (NSIS arm64)');
      await execCommandWithOutput(`cd packages/bruno-electron && npx electron-builder --win --arm64 --config electron-builder-config.js`);
      return;
    }

    // Determine the OS and set the appropriate argument for default multi-platform scripts
    let osArg;
    switch (os.platform()) {
      case 'win32':
        osArg = 'win';
        break;
      case 'darwin':
        osArg = 'mac';
        break;
      default:
        osArg = 'linux';
    }

    await execCommandWithOutput(`npm run dist:${osArg} --workspace=packages/bruno-electron`);
  } catch (error) {
    console.error('An error occurred:', error);
  }
}

main();
