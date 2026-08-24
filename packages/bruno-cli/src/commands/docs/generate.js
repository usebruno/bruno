const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const chalk = require('chalk');
const jsyaml = require('js-yaml');
const jsesc = require('jsesc');
const { brunoToOpenCollection } = require('@usebruno/converters');
const { generateApiDocsHtml, getApiDocsFileName, resolveCollectionVersion, sortByNameThenSequence: sortFolders } = require('@usebruno/common');
const { parseEnvironment } = require('@usebruno/filestore');
const { createCollectionJsonFromPathname } = require('../../utils/collection');
const { parseEnvironmentJson } = require('../../utils/environment');
const { CLI_VERSION, EXIT_STATUS } = require('../../constants');

const splitCsv = (value) =>
  value
    ? String(value)
        .split(',')
        .map((entry) => entry.trim())
        .filter(Boolean)
    : [];

const findConflict = (include, exclude) => {
  const excluded = new Set(exclude);
  return include.find((name) => excluded.has(name));
};

const loadEnvironments = (collectionPath) => {
  const environmentsDir = path.join(collectionPath, 'environments');
  if (!fs.existsSync(environmentsDir)) {
    return [];
  }

  return fs
    .readdirSync(environmentsDir)
    .filter((file) => /\.(bru|yml|json)$/i.test(file))
    .map((file) => {
      const filePath = path.join(environmentsDir, file);
      const fileExt = path.extname(file).toLowerCase();
      const content = fs.readFileSync(filePath, 'utf8');

      if (fileExt === '.json') {
        const parsed = parseEnvironmentJson(JSON.parse(content));
        return { ...parsed, name: parsed.name || path.basename(file, '.json'), variables: parsed.variables || [] };
      }

      const format = fileExt === '.yml' ? 'yml' : 'bru';
      const normalized = format === 'bru' ? content.replace(/\r\n/g, '\n') : content;
      const envJson = parseEnvironment(normalized, { format });
      return { ...envJson, name: envJson.name || path.basename(file, fileExt), variables: envJson.variables || [] };
    });
};

const getGitRemoteUrl = (collectionPath) => {
  try {
    const url = execSync('git remote get-url origin', {
      cwd: collectionPath,
      stdio: ['ignore', 'pipe', 'ignore']
    })
      .toString()
      .trim();
    return url || undefined;
  } catch (error) {
    return undefined;
  }
};

const command = 'generate';
const desc = 'Generate standalone HTML documentation for the collection';

const builder = (yargs) => {
  return yargs
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Path to write the documentation file to'
    })
    .option('format', {
      alias: 'f',
      type: 'string',
      default: 'html',
      description: 'Output format; only "html" is supported today'
    })
    .option('envs', {
      type: 'string',
      description: 'Comma-separated environment names to embed'
    })
    .option('exclude-envs', {
      type: 'string',
      description: 'Comma-separated environment names to leave out'
    })
    .option('tags', {
      type: 'string',
      description: 'Comma-separated tags; only requests carrying one are included'
    })
    .option('exclude-tags', {
      type: 'string',
      description: 'Comma-separated tags; requests carrying one are dropped'
    })
    .option('git-link', {
      type: 'boolean',
      default: true,
      description: 'Embed the git repo link (use --no-git-link to omit)'
    })
    .example('$0 docs generate', 'Generate docs for the collection in the current directory')
    .example('$0 docs generate --envs Production -o docs/api.html', 'Embed one environment and set the output path')
    .example('$0 docs generate --exclude-tags WIP --no-git-link', 'Drop WIP requests and omit the git link');
};

const handler = async (argv) => {
  try {
    const format = String(argv.format || 'html').toLowerCase();
    if (format !== 'html') {
      console.error(chalk.red(`Invalid output format "${format}". Only "html" is supported.`));
      process.exit(EXIT_STATUS.ERROR_INCORRECT_OUTPUT_FORMAT);
    }

    global.brunoSkippedFiles = [];
    const collectionPath = process.cwd();
    const collection = createCollectionJsonFromPathname(collectionPath, { sortFolders });

    collection.name = collection.brunoConfig?.name;
    collection.environments = loadEnvironments(collectionPath);

    const includeTags = splitCsv(argv.tags);
    const excludeTags = splitCsv(argv.excludeTags);
    const includeEnvs = splitCsv(argv.envs);
    const excludeEnvs = splitCsv(argv.excludeEnvs);

    const conflictingTag = findConflict(includeTags, excludeTags);
    if (conflictingTag) {
      console.error(chalk.red('Tag cannot be both included and excluded: ') + chalk.dim(conflictingTag));
      process.exit(EXIT_STATUS.ERROR_GENERIC);
    }
    const conflictingEnv = findConflict(includeEnvs, excludeEnvs);
    if (conflictingEnv) {
      console.error(chalk.red('Environment cannot be both included and excluded: ') + chalk.dim(conflictingEnv));
      process.exit(EXIT_STATUS.ERROR_GENERIC);
    }

    const availableEnvNames = new Set(collection.environments.map((env) => env.name));
    const missingEnv = [...includeEnvs, ...excludeEnvs].find((name) => !availableEnvNames.has(name));
    if (missingEnv) {
      console.error(chalk.red('Environment not found: ') + chalk.dim(missingEnv));
      process.exit(EXIT_STATUS.ERROR_ENV_NOT_FOUND);
    }
    const excludeOnly = includeEnvs.length === 0 && excludeEnvs.length > 0;
    const envInclude = excludeOnly ? [...availableEnvNames] : includeEnvs;

    const gitCollectionUrl = argv.gitLink ? getGitRemoteUrl(collectionPath) : undefined;

    const html = generateApiDocsHtml(
      collection,
      {
        tags: { include: includeTags, exclude: excludeTags },
        environments: { include: envInclude, exclude: excludeEnvs },
        gitCollectionUrl,
        collectionVersion: resolveCollectionVersion(collection.brunoConfig, collection.format === 'yml'),
        exportedAt: new Date().toISOString(),
        exportedUsing: `usebruno-cli/${CLI_VERSION}`
      },
      { brunoToOpenCollection, dumpYaml: jsyaml.dump, escapeString: jsesc }
    );

    const outputPath = path.resolve(argv.output || getApiDocsFileName(collection.name));
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, html);

    console.log(chalk.green(`Documentation generated: ${outputPath}`));
    if (global.brunoSkippedFiles.length > 0) {
      console.error(
        chalk.yellow(`${global.brunoSkippedFiles.length} file(s) could not be parsed and were left out of the documentation.`)
      );
    }
  } catch (error) {
    console.error(chalk.red('Failed to generate documentation:'), error.message);
    process.exit(EXIT_STATUS.ERROR_GENERIC);
  }
};

module.exports = { command, desc, builder, handler };
