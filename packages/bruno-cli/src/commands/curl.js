const chalk = require('chalk');
const path = require('path');
const { cloneDeep, find, filter } = require('lodash');
const { loadEnvironments } = require('../utils/env-loader');
const constants = require('../constants');
const { findItemInCollection, createCollectionJsonFromPathname, FORMAT_CONFIG } = require('../utils/collection');
const prepareRequest = require('../runner/prepare-request');
const interpolateVars = require('../runner/interpolate-vars');
const { buildCurlCommand } = require('../utils/curl-builder');

const command = 'curl <path>';
const desc = 'Generate a curl command from a request';

const builder = async (yargs) => {
  yargs
    .option('env', {
      describe: 'Environment name',
      type: 'string'
    })
    .option('env-file', {
      describe: 'Path to environment file (.bru or .json) - absolute or relative',
      type: 'string'
    })
    .option('global-env', {
      describe: 'Global environment name (requires collection to be in a workspace)',
      type: 'string'
    })
    .option('workspace-path', {
      describe: 'Path to workspace directory (auto-detected if not provided)',
      type: 'string'
    })
    .option('env-var', {
      describe: 'Overwrite a single environment variable, multiple usages possible',
      type: 'string'
    })
    .example('$0 curl request.bru', 'Generate a curl command from a request')
    .example('$0 curl request.bru --env local', 'Generate a curl command with the environment set to local');
};

const handler = async function (argv) {
  try {
    let {
      path: requestPath,
      env,
      envFile,
      globalEnv,
      workspacePath,
      envVar
    } = argv;

    const collectionPath = process.cwd();
    let collection = createCollectionJsonFromPathname(collectionPath);

    const { envVars, globalEnvVars, processEnvVars } = await loadEnvironments({
      collectionPath, collection, env, envFile, globalEnv, workspacePath, envVar
    });

    // --- Resolve request item ---

    const ext = FORMAT_CONFIG[collection.format].ext;
    let itemPathname = path.resolve(collectionPath, requestPath);
    if (!itemPathname.endsWith(ext)) {
      itemPathname = `${itemPathname}${ext}`;
    }

    const item = cloneDeep(findItemInCollection(collection, itemPathname));
    if (!item) {
      console.error(chalk.red(`Request not found: `) + chalk.dim(requestPath));
      process.exit(constants.EXIT_STATUS.ERROR_FILE_NOT_FOUND);
    }

    if (item.type === 'folder') {
      console.error(chalk.red(`Path is a folder, not a request: `) + chalk.dim(requestPath));
      process.exit(constants.EXIT_STATUS.ERROR_GENERIC);
    }

    // --- Capture file paths before prepareRequest reads them into buffers ---

    const filePaths = {};
    const bodyMode = item.request?.body?.mode;

    if (bodyMode === 'file') {
      const bodyFile = find(item.request.body.file, (param) => param.selected);
      if (bodyFile && bodyFile.filePath) {
        let fp = bodyFile.filePath;
        if (!path.isAbsolute(fp)) {
          fp = path.join(collectionPath, fp);
        }
        filePaths.body = fp;
      }
    }

    if (bodyMode === 'multipartForm') {
      const enabledParams = filter(item.request.body.multipartForm, (p) => p.enabled);
      filePaths.multipart = enabledParams
        .filter((p) => p.type === 'file')
        .map((p) => {
          let fp = p.value || '';
          if (fp && !path.isAbsolute(fp)) {
            fp = path.join(collectionPath, fp);
          }
          return { name: p.name, path: fp };
        });
    }

    // --- Prepare and interpolate ---

    const request = await prepareRequest(item, collection);
    request.globalEnvironmentVariables = globalEnvVars;
    interpolateVars(request, envVars, {}, processEnvVars);

    // Parse GraphQL variables after interpolation
    if (request.mode === 'graphql' && typeof request.data?.variables === 'string') {
      try {
        request.data.variables = JSON.parse(request.data.variables);
      } catch (err) {
        // Leave as string if it can't be parsed
      }
    }

    // Add http:// prefix if missing
    const protocolRegex = /^([-+\w]{1,25})(:?\/\/|:)/;
    if (!protocolRegex.test(request.url)) {
      request.url = `http://${request.url}`;
    }

    // --- Build and output curl command ---

    const curlCommand = buildCurlCommand(request, { filePaths });
    console.log(curlCommand);
  } catch (err) {
    console.error(chalk.red(err.message));
    process.exit(constants.EXIT_STATUS.ERROR_GENERIC);
  }
};

module.exports = {
  command,
  desc,
  builder,
  handler
};
