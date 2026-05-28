const fs = require('fs');
const chalk = require('chalk');
const path = require('path');
const { forOwn } = require('lodash');
const { exists } = require('./filesystem');
const { getEnvVars } = require('./bru');
const { parseEnvironmentJson } = require('./environment');
const { parseDotEnv, parseEnvironment } = require('@usebruno/filestore');
const constants = require('../constants');
const { FORMAT_CONFIG } = require('./collection');

const loadEnvFromFile = (filePath, nameOverride) => {
  const fileExt = path.extname(filePath).toLowerCase();
  let result = {};

  if (fileExt === '.json') {
    const content = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(content);
    const normalizedEnv = parseEnvironmentJson(parsed);
    result = getEnvVars(normalizedEnv);
    const rawName = normalizedEnv?.name;
    const trimmedName = typeof rawName === 'string' ? rawName.trim() : '';
    result.__name__ = trimmedName || path.basename(filePath, '.json');
  } else if (fileExt === '.yml' || fileExt === '.yaml') {
    const content = fs.readFileSync(filePath, 'utf8');
    const envJson = parseEnvironment(content, { format: 'yml' });
    result = getEnvVars(envJson);
    result.__name__ = nameOverride || path.basename(filePath, fileExt);
  } else {
    const content = fs.readFileSync(filePath, 'utf8').replace(/\r\n/g, '\n');
    const envJson = parseEnvironment(content, { format: 'bru' });
    result = getEnvVars(envJson);
    result.__name__ = nameOverride || path.basename(filePath, '.bru');
  }

  return result;
};

/**
 * Load environment variables from all sources (--env-file, --env, --global-env, --env-var, .env).
 *
 * @param {object} options
 * @param {string} options.collectionPath - Absolute path to the collection root
 * @param {object} options.collection - The parsed collection object (needs .format)
 * @param {string} [options.env] - Collection environment name (--env)
 * @param {string} [options.envFile] - Path to an external environment file (--env-file)
 * @param {string} [options.globalEnv] - Global environment name (--global-env)
 * @param {string} [options.workspacePath] - Explicit workspace path (--workspace-path)
 * @param {string|string[]} [options.envVar] - Override variables (--env-var)
 * @returns {Promise<{ envVars: object, globalEnvVars: object, processEnvVars: object }>}
 */
async function loadEnvironments({ collectionPath, collection, env, envFile, globalEnv, workspacePath, envVar }) {
  let envVars = {};

  // Load --env-file if provided
  if (envFile) {
    const envFilePath = path.resolve(collectionPath, envFile);
    if (!(await exists(envFilePath))) {
      console.error(chalk.red(`Environment file not found: `) + chalk.dim(envFile));
      process.exit(constants.EXIT_STATUS.ERROR_ENV_NOT_FOUND);
    }
    try {
      envVars = loadEnvFromFile(envFilePath);
    } catch (err) {
      console.error(chalk.red(`Failed to parse environment file: ${err.message}`));
      process.exit(constants.EXIT_STATUS.ERROR_INVALID_FILE);
    }
  }

  // Load --env and merge (collection env takes precedence)
  if (env) {
    const envExt = FORMAT_CONFIG[collection.format].ext;
    const collectionEnvFilePath = path.join(collectionPath, 'environments', `${env}${envExt}`);
    if (!(await exists(collectionEnvFilePath))) {
      console.error(chalk.red(`Environment file not found: `) + chalk.dim(`environments/${env}${envExt}`));
      process.exit(constants.EXIT_STATUS.ERROR_ENV_NOT_FOUND);
    }
    try {
      const collectionEnvVars = loadEnvFromFile(collectionEnvFilePath, env);
      envVars = { ...envVars, ...collectionEnvVars };
    } catch (err) {
      console.error(chalk.red(`Failed to parse Environment file: ${err.message}`));
      process.exit(constants.EXIT_STATUS.ERROR_INVALID_FILE);
    }
  }

  // Load --global-env
  let globalEnvVars = {};
  if (globalEnv) {
    const findWorkspacePath = (startPath) => {
      let currentPath = startPath;
      while (currentPath !== path.dirname(currentPath)) {
        const workspaceYmlPath = path.join(currentPath, 'workspace.yml');
        if (fs.existsSync(workspaceYmlPath)) {
          return currentPath;
        }
        currentPath = path.dirname(currentPath);
      }
      return null;
    };

    if (!workspacePath) {
      workspacePath = findWorkspacePath(collectionPath);
    }

    if (!workspacePath) {
      console.error(chalk.red(`Workspace not found. Please specify a workspace path using --workspace-path or ensure the collection is inside a workspace directory.`));
      process.exit(constants.EXIT_STATUS.ERROR_GLOBAL_ENV_REQUIRES_WORKSPACE);
    }

    const workspaceExists = await exists(workspacePath);
    if (!workspaceExists) {
      console.error(chalk.red(`Workspace path not found: `) + chalk.dim(workspacePath));
      process.exit(constants.EXIT_STATUS.ERROR_WORKSPACE_NOT_FOUND);
    }

    const workspaceYmlPath = path.join(workspacePath, 'workspace.yml');
    const workspaceYmlExists = await exists(workspaceYmlPath);
    if (!workspaceYmlExists) {
      console.error(chalk.red(`Invalid workspace: workspace.yml not found in `) + chalk.dim(workspacePath));
      process.exit(constants.EXIT_STATUS.ERROR_WORKSPACE_NOT_FOUND);
    }

    const globalEnvFilePath = path.join(workspacePath, 'environments', `${globalEnv}.yml`);
    const globalEnvFileExists = await exists(globalEnvFilePath);
    if (!globalEnvFileExists) {
      console.error(chalk.red(`Global environment not found: `) + chalk.dim(`environments/${globalEnv}.yml`));
      console.error(chalk.dim(`Workspace: ${workspacePath}`));
      process.exit(constants.EXIT_STATUS.ERROR_GLOBAL_ENV_NOT_FOUND);
    }

    try {
      const globalEnvContent = fs.readFileSync(globalEnvFilePath, 'utf8');
      const globalEnvJson = parseEnvironment(globalEnvContent, { format: 'yml' });
      globalEnvVars = getEnvVars(globalEnvJson);
      globalEnvVars.__name__ = globalEnv;
    } catch (err) {
      console.error(chalk.red(`Failed to parse global environment: ${err.message}`));
      process.exit(constants.EXIT_STATUS.ERROR_INVALID_FILE);
    }
  }

  // Load --env-var overrides
  if (envVar) {
    let processVars;
    if (typeof envVar === 'string') {
      processVars = [envVar];
    } else if (typeof envVar === 'object' && Array.isArray(envVar)) {
      processVars = envVar;
    } else {
      console.error(chalk.red(`overridable environment variables not parsable: use name=value`));
      process.exit(constants.EXIT_STATUS.ERROR_MALFORMED_ENV_OVERRIDE);
    }
    if (processVars && Array.isArray(processVars)) {
      for (const value of processVars.values()) {
        // split the string at the first equals sign
        const match = value.match(/^([^=]+)=(.*)$/);
        if (!match) {
          console.error(
            chalk.red(`Overridable environment variable not correct: use name=value - presented: `)
            + chalk.dim(`${value}`)
          );
          process.exit(constants.EXIT_STATUS.ERROR_INCORRECT_ENV_OVERRIDE);
        }
        envVars[match[1]] = match[2];
      }
    }
  }

  // Load .env file at root of collection
  const dotEnvPath = path.join(collectionPath, '.env');
  const dotEnvExists = await exists(dotEnvPath);
  const processEnvVars = {
    ...process.env
  };
  if (dotEnvExists) {
    const content = fs.readFileSync(dotEnvPath, 'utf8');
    const jsonData = parseDotEnv(content);

    forOwn(jsonData, (value, key) => {
      processEnvVars[key] = value;
    });
  }

  return { envVars, globalEnvVars, processEnvVars };
}

module.exports = { loadEnvironments };
