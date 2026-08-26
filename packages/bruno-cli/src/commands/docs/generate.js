const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const jsyaml = require('js-yaml');
const jsesc = require('jsesc');
const { brunoToOpenCollection } = require('@usebruno/converters');
const { generateApiDocsHtml, getApiDocsFileName, resolveCollectionVersion } = require('@usebruno/common');
const { createCollectionJsonFromPathname } = require('../../utils/collection');
const { loadEnvironments } = require('../../utils/environment');
const { splitCsv, findConflict, getGitRemoteUrl } = require('../../utils/common');
const { CLI_VERSION, EXIT_STATUS } = require('../../constants');

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
    const collection = createCollectionJsonFromPathname(collectionPath);

    collection.name = collection.brunoConfig?.name;
    try {
      collection.environments = loadEnvironments(collectionPath);
    } catch (err) {
      console.error(chalk.red('Failed to parse environment file: ') + chalk.dim(err.message));
      process.exit(EXIT_STATUS.ERROR_INVALID_FILE);
    }

    const includeTags = splitCsv(argv.tags);
    const excludeTags = splitCsv(argv.excludeTags);
    const includeEnvs = [...new Set(splitCsv(argv.envs))];
    const excludeEnvs = [...new Set(splitCsv(argv.excludeEnvs))];

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
    const missingEnvs = [...includeEnvs, ...excludeEnvs].filter((name) => !availableEnvNames.has(name));
    if (missingEnvs.length > 0) {
      console.error(chalk.red('Environments not found: ') + chalk.dim(missingEnvs.join(', ')));
      process.exit(EXIT_STATUS.ERROR_ENV_NOT_FOUND);
    }

    if (includeEnvs.length > 0) {
      const envByName = new Map(collection.environments.map((env) => [env.name, env]));
      collection.environments = includeEnvs.map((name) => envByName.get(name));
    } else if (excludeEnvs.length > 0) {
      const excluded = new Set(excludeEnvs);
      collection.environments = collection.environments.filter((env) => !excluded.has(env.name));
    } else {
      collection.environments = [];
    }

    const gitCollectionUrl = argv.gitLink ? getGitRemoteUrl(collectionPath) : undefined;

    const html = generateApiDocsHtml(
      collection,
      {
        tags: { include: includeTags, exclude: excludeTags },
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
