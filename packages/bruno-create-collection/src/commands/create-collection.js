const fs = require('fs-extra');
const path = require('path');
const tree = require('tree-node-cli');
const chalk = require('chalk');

// Command definition
const command = '* [name]';
const desc = 'Scaffold a new Bruno API collection with best practices';

// Sanitize the collection name to ensure safe filenames (no path traversal, no absolute paths)
const sanitizeName = (name) => {
  // Only allow alphanumeric characters, hyphens, and underscores
  if (!/^[a-zA-Z0-9-_]+$/.test(name)) {
    throw new Error('Collection name can only contain letters, numbers, hyphens, and underscores');
  }

  return name;
}

// Builder for the create command
const builder = (yargs) => {
  return yargs
    .positional('name', {
      describe: 'collection directory name',
      type: 'string',
      default: 'my-bruno-collection',
      coerce: sanitizeName
    })
    .option('force', {
      alias: 'f',
      type: 'boolean',
      describe: 'overwrite target directory if it exists'
    })
    .option('tree', {
      type: 'boolean',
      default: true,
      describe: 'display directory tree'
    })
    // Basic usage - just the collection name
    .example('$0 my-api', 'Create a new collection named my-api')
    // Using the force flag with its short form
    .example('$0 my-api -f', 'Create a new collection named my-api, overwriting if it exists')
    // Using the force flag with its long form
    .example('$0 my-api --force', 'Same as above, but using long-form flag')
    // Disable tree output
    .example('$0 my-api --no-tree', 'Create collection without showing the directory tree')
    // Using default name
    .example('$0', 'Create a collection with default name (my-bruno-collection)');
};

async function replaceNameInBrunoJson(targetDir, collectionName) {
  const brunoJsonPath = path.join(targetDir, 'bruno.json');
  const brunoJson = fs.readJsonSync(brunoJsonPath);
  // capitalize the first letter of every word in the collection name. replace - & _ with space
  brunoJson.name = collectionName.split(/[-_]/).map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
  fs.writeJsonSync(brunoJsonPath, brunoJson, { spaces: 2 });
}

/**
 * Creates a new Bruno collection from the template
 * @param {Object} argv - Command line arguments
 */
async function handler(argv) {
  try {
    const collectionName = argv.name || 'my-bruno-collection';
    const targetDir = path.join(process.cwd(), collectionName);
    const templateDir = path.join(__dirname, '../../templates/default');

    // Check if directory exists
    if (fs.existsSync(targetDir)) {
      if (!argv.force) {
        console.error(chalk.red(`Error: Directory "${collectionName}" already exists.`));
        console.log(chalk.yellow(`\nTip: Use --force to overwrite existing directory`));
        process.exit(1);
      }
      await fs.remove(targetDir);
    }

    // Create collection from template
    await fs.copy(templateDir, targetDir);

    // Replace the name in the bruno.json file
    await replaceNameInBrunoJson(targetDir, collectionName);

    // Success output
    console.log('\n' + chalk.green('✅ Bruno collection created successfully!'));
    console.log(chalk.blue('📁 Location:'), chalk.white(targetDir));

    // Display directory tree if enabled
    if (argv.tree !== false) {
      console.log('\n' + chalk.blue('📂 Collection Structure:'));
      console.log(tree(targetDir, {
        exclude: [/node_modules/, /\.git/],
        maxDepth: 10,
        allFiles: true,
        dirsFirst: true
      }));
    }

    // Next steps
    console.log('\n' + chalk.blue('Next steps:'));
    console.log(chalk.white(`  1. cd ${collectionName}`));
    console.log(chalk.white('  2. Open it in Bruno using the "Open Collection" button'));
    console.log(chalk.white('  3. Configure your environment variables in environments/\n'));

  } catch (error) {
    console.error(chalk.red('\n❌ Failed to create Bruno collection:'));
    console.error(chalk.red(error.message));
    process.exit(1);
  }
}

module.exports = {
  command,
  desc,
  builder,
  handler
};