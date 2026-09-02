const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const jsyaml = require('js-yaml');
const jsesc = require('jsesc');
const { brunoToOpenCollection } = require('@usebruno/converters');
const { generateApiDocsHtml, getApiDocsFileName, resolveCollectionVersion } = require('@usebruno/common');
const { createCollectionJsonFromPathname } = require('../../utils/collection');
const { loadEnvironments } = require('../../utils/environment');
const { parseListOption, findConflicts, pluralizeWord } = require('../../utils/common');
const { getGitRemoteUrl } = require('../../utils/git');
const { CLI_VERSION, EXIT_STATUS } = require('../../constants');

const command = 'generate';
const desc = 'Generate a standalone HTML documentation page for the collection';

const builder = (yargs) => {
  return yargs
    .option('output', {
      alias: 'o',
      type: 'string',
      description: 'Path to write the documentation file (defaults to the collection name)'
    })
    .option('envs', {
      type: 'array',
      description: 'Environments to include (comma-separated)'
    })
    .option('exclude-envs', {
      type: 'array',
      description: 'Environments to leave out (comma-separated)'
    })
    .option('all-envs', {
      type: 'boolean',
      default: false,
      description: 'Include every environment in the collection'
    })
    .option('tags', {
      type: 'array',
      description: 'Only include requests with these tags (comma-separated)'
    })
    .option('exclude-tags', {
      type: 'array',
      description: 'Skip requests with these tags (comma-separated)'
    })
    .option('git-link', {
      type: 'boolean',
      description: 'Add a link to the git repo (on by default; --no-git-link to skip)'
    })
    .example('$0 docs generate', 'Document the collection in the current folder')
    .example('$0 docs generate -o docs/api.html', 'Save the page to a specific path')
    .example('$0 docs generate --envs Production', 'Include just the Production environment')
    .example('$0 docs generate --envs staging,prod', 'Include several environments (comma-separated)')
    .example('$0 docs generate --all-envs', 'Include every environment')
    .example('$0 docs generate --tags public,stable', 'Only document requests tagged public or stable')
    .example('$0 docs generate --exclude-tags WIP --no-git-link', 'Hide WIP requests and omit the git link');
};

const handler = async (argv) => {
  try {
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

    const includeTags = parseListOption(argv.tags);
    const excludeTags = parseListOption(argv.excludeTags);
    const includeEnvs = [...new Set(parseListOption(argv.envs))];
    const excludeEnvs = [...new Set(parseListOption(argv.excludeEnvs))];
    const allEnvs = Boolean(argv.allEnvs);

    const conflictingTags = findConflicts(includeTags, excludeTags);
    if (conflictingTags.length > 0) {
      console.error(chalk.red(`${pluralizeWord(conflictingTags.length, 'Tag')} cannot be both included and excluded: `) + chalk.dim(conflictingTags.join(', ')));
      process.exit(EXIT_STATUS.ERROR_GENERIC);
    }
    const conflictingEnvs = findConflicts(includeEnvs, excludeEnvs);
    if (conflictingEnvs.length > 0) {
      console.error(chalk.red(`${pluralizeWord(conflictingEnvs.length, 'Environment')} cannot be both included and excluded: `) + chalk.dim(conflictingEnvs.join(', ')));
      process.exit(EXIT_STATUS.ERROR_GENERIC);
    }
    if (allEnvs && includeEnvs.length > 0) {
      console.error(chalk.red('--all-envs cannot be combined with --envs'));
      process.exit(EXIT_STATUS.ERROR_GENERIC);
    }

    const availableEnvNames = new Set(collection.environments.map((env) => env.name));
    const missingEnvs = [...includeEnvs, ...excludeEnvs].filter((name) => !availableEnvNames.has(name));
    if (missingEnvs.length > 0) {
      console.error(chalk.red(`${pluralizeWord(missingEnvs.length, 'Environment')} not found: `) + chalk.dim(missingEnvs.join(', ')));
      process.exit(EXIT_STATUS.ERROR_ENV_NOT_FOUND);
    }

    if (includeEnvs.length > 0) {
      const envByName = new Map(collection.environments.map((env) => [env.name, env]));
      collection.environments = includeEnvs.map((name) => envByName.get(name));
    } else if (excludeEnvs.length > 0) {
      const excluded = new Set(excludeEnvs);
      collection.environments = collection.environments.filter((env) => !excluded.has(env.name));
    } else if (!allEnvs) {
      collection.environments = [];
    }

    const gitLinkEnabled = argv.gitLink !== false;
    const gitCollectionUrl = gitLinkEnabled ? getGitRemoteUrl(collectionPath) : undefined;
    if (argv.gitLink === true && !gitCollectionUrl) {
      console.error(chalk.yellow('No git remote \'origin\' found; the git link was omitted.'));
    }

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
