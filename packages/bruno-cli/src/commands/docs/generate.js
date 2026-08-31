const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const jsyaml = require('js-yaml');
const jsesc = require('jsesc');
const { brunoToOpenCollection } = require('@usebruno/converters');
const { generateApiDocsHtml, getApiDocsFileName, resolveCollectionVersion } = require('@usebruno/common');
const { createCollectionJsonFromPathname } = require('../../utils/collection');
const { loadEnvironments } = require('../../utils/environment');
const { splitCsv, hasCommaValue, findConflicts, getGitRemoteUrl } = require('../../utils/common');
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
    .option('envs', {
      type: 'array',
      description: 'Environment names to embed, comma-separated (repeatable). For one name use --env'
    })
    .option('env', {
      type: 'string',
      description: 'A single environment name to embed; repeat for more. No commas (use --envs for a list)'
    })
    .option('exclude-envs', {
      type: 'array',
      description: 'Environment names to leave out, comma-separated (repeatable). For one name use --exclude-env'
    })
    .option('exclude-env', {
      type: 'string',
      description: 'A single environment name to leave out; repeat for more. No commas (use --exclude-envs for a list)'
    })
    .option('all-envs', {
      type: 'boolean',
      default: false,
      description: 'Embed every environment in the collection'
    })
    .option('tags', {
      type: 'array',
      description: 'Only include requests carrying one of these tags, comma-separated (repeatable). For one tag use --tag'
    })
    .option('tag', {
      type: 'string',
      description: 'A single tag to include; repeat for more. No commas (use --tags for a list)'
    })
    .option('exclude-tags', {
      type: 'array',
      description: 'Drop requests carrying one of these tags, comma-separated (repeatable). For one tag use --exclude-tag'
    })
    .option('exclude-tag', {
      type: 'string',
      description: 'A single tag to drop; repeat for more. No commas (use --exclude-tags for a list)'
    })
    .option('git-link', {
      type: 'boolean',
      default: true,
      description: 'Embed the git repo link (use --no-git-link to omit)'
    })
    .example('$0 docs generate', 'Generate docs for the collection in the current directory')
    .example('$0 docs generate --envs Production -o docs/api.html', 'Embed one environment and set the output path')
    .example('$0 docs generate --all-envs', 'Embed every environment in the collection')
    .example('$0 docs generate --exclude-tag WIP --no-git-link', 'Drop WIP requests and omit the git link');
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

    const singularFlags = [
      { name: '--tag', plural: '--tags', value: argv.tag },
      { name: '--exclude-tag', plural: '--exclude-tags', value: argv.excludeTag },
      { name: '--env', plural: '--envs', value: argv.env },
      { name: '--exclude-env', plural: '--exclude-envs', value: argv.excludeEnv }
    ];
    const commaFlag = singularFlags.find((flag) => hasCommaValue(flag.value));
    if (commaFlag) {
      console.error(
        chalk.red(
          `${commaFlag.name} takes a single value; use ${commaFlag.plural} for a comma-separated list, or repeat ${commaFlag.name}`
        )
      );
      process.exit(EXIT_STATUS.ERROR_GENERIC);
    }

    const includeTags = [...splitCsv(argv.tags), ...splitCsv(argv.tag)];
    const excludeTags = [...splitCsv(argv.excludeTags), ...splitCsv(argv.excludeTag)];
    const includeEnvs = [...new Set([...splitCsv(argv.envs), ...splitCsv(argv.env)])];
    const excludeEnvs = [...new Set([...splitCsv(argv.excludeEnvs), ...splitCsv(argv.excludeEnv)])];
    const allEnvs = Boolean(argv.allEnvs);

    const conflictingTags = findConflicts(includeTags, excludeTags);
    if (conflictingTags.length > 0) {
      console.error(chalk.red('Tags cannot be both included and excluded: ') + chalk.dim(conflictingTags.join(', ')));
      process.exit(EXIT_STATUS.ERROR_GENERIC);
    }
    const conflictingEnvs = findConflicts(includeEnvs, excludeEnvs);
    if (conflictingEnvs.length > 0) {
      console.error(chalk.red('Environments cannot be both included and excluded: ') + chalk.dim(conflictingEnvs.join(', ')));
      process.exit(EXIT_STATUS.ERROR_GENERIC);
    }
    if (allEnvs && (includeEnvs.length > 0 || excludeEnvs.length > 0)) {
      const conflictingFlags = [];
      if (includeEnvs.length > 0) conflictingFlags.push('--env/--envs');
      if (excludeEnvs.length > 0) conflictingFlags.push('--exclude-env/--exclude-envs');
      console.error(chalk.red(`--all-envs cannot be combined with ${conflictingFlags.join(' or ')}`));
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
    } else if (!allEnvs) {
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
