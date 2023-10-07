const _ = require('lodash');
const fs = require('fs');
const path = require('path');
const chokidar = require('chokidar');
const { hasBruExtension, writeFile } = require('../utils/filesystem');
const { bruToEnvJson, envJsonToBru, bruToJson, jsonToBru } = require('../bru');
const { dotenvToJson } = require('@usebruno/lang');

const { uuid } = require('../utils/common');
const { getRequestUid } = require('../cache/requestUids');
const { decryptString } = require('../utils/encryption');
const { setDotEnvVars } = require('../store/process-env');
const { setBrunoConfig, getBrunoConfig, getLangFromBrunoConfig } = require('../store/bruno-config');
const EnvironmentSecretsStore = require('../store/env-secrets');

const environmentSecretsStore = new EnvironmentSecretsStore();

const isJsonEnvironmentConfig = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);

  return dirname === collectionPath && basename === 'environments.json';
};

const isDotEnvFile = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);

  return dirname === collectionPath && basename === '.env';
};

const isBrunoConfigFile = (pathname, collectionPath) => {
  const dirname = path.dirname(pathname);
  const basename = path.basename(pathname);

  return dirname === collectionPath && basename === 'bruno.json';
};

/**
 * @param {string} pathname
 * @param {string} collectionPath
 * @param {string} collectionUid
 * @returns {boolean}
 */
const isBruEnvironmentConfig = (pathname, collectionPath, collectionUid) => {
  const { dir, ext } = path.parse(pathname);
  const envDirectory = path.join(collectionPath, 'environments');

  return dir === envDirectory && getLangFromBrunoConfig(collectionUid) === ext;
};

const hydrateRequestWithUuid = (request, pathname) => {
  request.uid = getRequestUid(pathname);

  const params = _.get(request, 'request.params', []);
  const headers = _.get(request, 'request.headers', []);
  const requestVars = _.get(request, 'request.vars.req', []);
  const responseVars = _.get(request, 'request.vars.res', []);
  const assertions = _.get(request, 'request.assertions', []);
  const bodyFormUrlEncoded = _.get(request, 'request.body.formUrlEncoded', []);
  const bodyMultipartForm = _.get(request, 'request.body.multipartForm', []);

  params.forEach((param) => (param.uid = uuid()));
  headers.forEach((header) => (header.uid = uuid()));
  requestVars.forEach((variable) => (variable.uid = uuid()));
  responseVars.forEach((variable) => (variable.uid = uuid()));
  assertions.forEach((assertion) => (assertion.uid = uuid()));
  bodyFormUrlEncoded.forEach((param) => (param.uid = uuid()));
  bodyMultipartForm.forEach((param) => (param.uid = uuid()));

  return request;
};

const envHasSecrets = (environment = {}) => {
  const secrets = _.filter(environment.variables, (v) => v.secret);

  return secrets && secrets.length > 0;
};

/**
 * @param {*} win
 * @param {string} pathname
 * @param {string} collectionUid
 * @param {string} collectionPath
 */
const addEnvironmentFile = async (win, pathname, collectionUid, collectionPath) => {
  try {
    const { root, dir, name, base } = path.parse(pathname);
    const lang = getLangFromBrunoConfig(collectionUid);
    const targetFilePath = path.format({
      root,
      dir,
      name,
      // Overriding extension here to enforce lang preference
      ext: `.${lang}`
    });

    const file = {
      meta: {
        collectionUid,
        pathname: targetFilePath,
        name: base
      }
    };

    const envFileContent = fs.readFileSync(targetFilePath, 'utf8');
    // TODO: If we add other formats we should extract this functionality for reuse
    file.data = lang === 'json' ? JSON.parse(envFileContent) : bruToEnvJson(envFileContent);
    file.name = name;
    file.uid = getRequestUid(pathname);

    _.each(_.get(file, 'data.variables', []), (variable) => (variable.uid = uuid()));

    // hydrate environment variables with secrets
    if (envHasSecrets(file.data)) {
      const envSecrets = environmentSecretsStore.getEnvSecrets(collectionPath, file.data);
      _.each(envSecrets, (secret) => {
        const variable = _.find(file.data.variables, (v) => v.name === secret.name);
        if (variable && secret.value) {
          variable.value = decryptString(secret.value);
        }
      });
    }

    win.webContents.send('main:collection-tree-updated', 'addEnvironmentFile', file);
  } catch (err) {
    console.error(err);
  }
};

/**
 * @param {*} win
 * @param {string} pathname
 * @param {string} collectionUid
 * @param {string} collectionPath
 */
const changeEnvironmentFile = async (win, pathname, collectionUid, collectionPath) => {
  try {
    const { root, dir, name, base } = path.parse(pathname);
    const lang = getLangFromBrunoConfig(collectionUid);
    const targetFilePath = path.format({
      root,
      dir,
      name,
      // Overriding extension here to enforce lang preference
      ext: `.${lang}`
    });

    const file = {
      meta: {
        collectionUid,
        pathname: targetFilePath,
        name: base
      }
    };

    const envFileContent = fs.readFileSync(targetFilePath, 'utf8');
    // TODO: If we add other formats we should extract this functionality for reuse
    file.data = lang === 'json' ? JSON.parse(envFileContent) : bruToEnvJson(envFileContent);
    file.name = name;
    file.uid = getRequestUid(pathname);

    _.each(_.get(file, 'data.variables', []), (variable) => (variable.uid = uuid()));

    // hydrate environment variables with secrets
    if (envHasSecrets(file.data)) {
      const envSecrets = environmentSecretsStore.getEnvSecrets(collectionPath, file.data);
      _.each(envSecrets, (secret) => {
        const variable = _.find(file.data.variables, (v) => v.name === secret.name);
        if (variable && secret.value) {
          variable.value = decryptString(secret.value);
        }
      });
    }

    // we are reusing the addEnvironmentFile event itself
    // this is because the uid of the pathname remains the same
    // and the collection tree will be able to update the existing environment
    win.webContents.send('main:collection-tree-updated', 'addEnvironmentFile', file);
  } catch (err) {
    console.error(err);
  }
};

const unlinkEnvironmentFile = async (win, pathname, collectionUid) => {
  try {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname)
      },
      data: {
        uid: getRequestUid(pathname),
        name: path.basename(pathname).substring(0, path.basename(pathname).length - 4)
      }
    };

    win.webContents.send('main:collection-tree-updated', 'unlinkEnvironmentFile', file);
  } catch (err) {
    console.error(err);
  }
};

const add = async (win, pathname, collectionUid, collectionPath) => {
  console.log(`watcher add: ${pathname}`);

  if (isBrunoConfigFile(pathname, collectionPath)) {
    try {
      const content = fs.readFileSync(pathname, 'utf8');
      const brunoConfig = JSON.parse(content);

      setBrunoConfig(collectionUid, brunoConfig);
    } catch (err) {
      console.error(err);
    }
  }

  if (isDotEnvFile(pathname, collectionPath)) {
    try {
      const content = fs.readFileSync(pathname, 'utf8');
      const jsonData = dotenvToJson(content);

      setDotEnvVars(collectionUid, jsonData);
      const payload = {
        collectionUid,
        processEnvVariables: {
          ...process.env,
          ...jsonData
        }
      };
      win.webContents.send('main:process-env-update', payload);
    } catch (err) {
      console.error(err);
    }
  }

  if (isJsonEnvironmentConfig(pathname, collectionPath)) {
    try {
      const dirname = path.dirname(pathname);
      const bruContent = fs.readFileSync(pathname, 'utf8');

      const jsonData = JSON.parse(bruContent);

      const envDirectory = path.join(dirname, 'environments');
      if (!fs.existsSync(envDirectory)) {
        fs.mkdirSync(envDirectory);
      }

      for (const env of jsonData) {
        const bruEnvFilename = path.join(envDirectory, `${env.name}.bru`);
        const bruContent = envJsonToBru(env);
        await writeFile(bruEnvFilename, bruContent);
      }

      await fs.unlinkSync(pathname);
    } catch (err) {
      // do nothing
    }

    return;
  }

  if (isBruEnvironmentConfig(pathname, collectionPath, collectionUid)) {
    return addEnvironmentFile(win, pathname, collectionUid, collectionPath);
  }

  if (hasBruExtension(pathname)) {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname)
      }
    };

    try {
      let bruContent = fs.readFileSync(pathname, 'utf8');

      file.data = bruToJson(bruContent);
      hydrateRequestWithUuid(file.data, pathname);
      win.webContents.send('main:collection-tree-updated', 'addFile', file);
    } catch (err) {
      console.error(err);
    }
  }
};

const addDirectory = (win, pathname, collectionUid, collectionPath) => {
  const envDirectory = path.join(collectionPath, 'environments');

  if (pathname === envDirectory) {
    return;
  }

  const directory = {
    meta: {
      collectionUid,
      pathname,
      name: path.basename(pathname)
    }
  };
  win.webContents.send('main:collection-tree-updated', 'addDir', directory);
};

const change = async (win, pathname, collectionUid, collectionPath) => {
  if (isBrunoConfigFile(pathname, collectionPath)) {
    try {
      const content = fs.readFileSync(pathname, 'utf8');
      const brunoConfig = JSON.parse(content);

      const payload = {
        collectionUid,
        brunoConfig: brunoConfig
      };

      setBrunoConfig(collectionUid, brunoConfig);
      win.webContents.send('main:bruno-config-update', payload);
    } catch (err) {
      console.error(err);
    }
  }

  if (isDotEnvFile(pathname, collectionPath)) {
    try {
      const content = fs.readFileSync(pathname, 'utf8');
      const jsonData = dotenvToJson(content);

      setDotEnvVars(collectionUid, jsonData);
      const payload = {
        collectionUid,
        processEnvVariables: {
          ...process.env,
          ...jsonData
        }
      };
      win.webContents.send('main:process-env-update', payload);
    } catch (err) {
      console.error(err);
    }
  }

  if (isBruEnvironmentConfig(pathname, collectionPath, collectionUid)) {
    return changeEnvironmentFile(win, pathname, collectionUid, collectionPath);
  }

  if (hasBruExtension(pathname)) {
    try {
      const file = {
        meta: {
          collectionUid,
          pathname,
          name: path.basename(pathname)
        }
      };

      const bru = fs.readFileSync(pathname, 'utf8');
      file.data = bruToJson(bru);
      hydrateRequestWithUuid(file.data, pathname);
      win.webContents.send('main:collection-tree-updated', 'change', file);
    } catch (err) {
      console.error(err);
    }
  }
};

const unlink = (win, pathname, collectionUid, collectionPath) => {
  if (isBruEnvironmentConfig(pathname, collectionPath, collectionUid)) {
    return unlinkEnvironmentFile(win, pathname, collectionUid);
  }

  if (hasBruExtension(pathname)) {
    const file = {
      meta: {
        collectionUid,
        pathname,
        name: path.basename(pathname)
      }
    };
    win.webContents.send('main:collection-tree-updated', 'unlink', file);
  }
};

const unlinkDir = (win, pathname, collectionUid, collectionPath) => {
  const envDirectory = path.join(collectionPath, 'environments');

  if (pathname === envDirectory) {
    return;
  }

  const directory = {
    meta: {
      collectionUid,
      pathname,
      name: path.basename(pathname)
    }
  };
  win.webContents.send('main:collection-tree-updated', 'unlinkDir', directory);
};

class Watcher {
  constructor() {
    this.watchers = {};
  }

  addWatcher(win, watchPath, collectionUid) {
    if (this.watchers[watchPath]) {
      this.watchers[watchPath].close();
    }

    const self = this;
    setTimeout(() => {
      const watcher = chokidar.watch(watchPath, {
        ignoreInitial: false,
        usePolling: false,
        ignored: (path) => ['node_modules', '.git'].some((s) => path.includes(s)),
        persistent: true,
        ignorePermissionErrors: true,
        awaitWriteFinish: {
          stabilityThreshold: 80,
          pollInterval: 10
        },
        depth: 20
      });

      watcher
        .on('add', (pathname) => add(win, pathname, collectionUid, watchPath))
        .on('addDir', (pathname) => addDirectory(win, pathname, collectionUid, watchPath))
        .on('change', (pathname) => change(win, pathname, collectionUid, watchPath))
        .on('unlink', (pathname) => unlink(win, pathname, collectionUid, watchPath))
        .on('unlinkDir', (pathname) => unlinkDir(win, pathname, collectionUid, watchPath));

      self.watchers[watchPath] = watcher;
    }, 100);
  }

  hasWatcher(watchPath) {
    return this.watchers[watchPath];
  }

  removeWatcher(watchPath, win) {
    if (this.watchers[watchPath]) {
      this.watchers[watchPath].close();
      this.watchers[watchPath] = null;
    }
  }
}

module.exports = Watcher;
