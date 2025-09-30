const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const jsyaml = require('js-yaml');
const axios = require('axios');
const { openApiToBruno } = require('@usebruno/converters');
const { exists, isDirectory, sanitizeName } = require('../utils/filesystem');
const { createCollectionFromBrunoObject } = require('../utils/collection');

const command = 'import <type>';
const desc = 'Import a collection from other formats';

const builder = (yargs) => {
  yargs
    .positional('type', {
      describe: 'Type of collection to import',
      type: 'string',
      choices: ['openapi']
    })
    .option('source', {
      alias: 's',
      describe: 'Path to the source file or URL',
      type: 'string',
      demandOption: true
    })
    .option('output', {
      alias: 'o',
      describe: 'Path to the output directory',
      type: 'string',
      conflicts: 'output-file'
    })
    .option('output-file', {
      alias: 'f',
      describe: 'Path to the output JSON file',
      type: 'string',
      conflicts: 'output'
    })
    .option('collection-name', {
      alias: 'n',
      describe: 'Name for the imported collection',
      type: 'string'
    })
    .option('insecure', {
      type: 'boolean',
      describe: 'Skip SSL certificate verification when fetching from URLs',
      default: false
    })
    .option('group-by', {
      alias: 'g',
      describe: 'How to group the imported requests: "tags" groups by OpenAPI tags, "path" groups by URL path structure',
      type: 'string',
      choices: ['tags', 'path'],
      default: 'tags'
    })
    .example('$0 import openapi --source api.yml --output ~/Desktop/my-collection --collection-name "My API"')
    .example('$0 import openapi -s api.yml -o ~/Desktop/my-collection -n "My API"')
    .example('$0 import openapi --source https://example.com/api-spec.json --output ~/Desktop --collection-name "Remote API"')
    .example('$0 import openapi --source https://self-signed.example.com/api.json --insecure --output ~/Desktop')
    .example('$0 import openapi --source api.yml --output-file ~/Desktop/my-collection.json --collection-name "My API"')
    .example('$0 import openapi -s api.yml -f ~/Desktop/my-collection.json -n "My API"')
    .example('$0 import openapi --source api.yml --output ~/Desktop/my-collection --group-by path')
    .example('$0 import openapi -s api.yml -o ~/Desktop/my-collection -g tags');
};

const isUrl = (str) => {
  try {
    return Boolean(new URL(str));
  } catch (error) {
    return false;
  }
};

const readOpenApiFile = async (source, options = {}) => {
  try {
    let content;
    
    if (isUrl(source)) {
      // Handle URL input
      console.log(chalk.yellow(`Fetching specification from URL: ${source}`));
      try {
        const axiosOptions = {
          timeout: 30000, // 30 second timeout
          maxContentLength: 10 * 1024 * 1024,
          validateStatus: status => status >= 200 && status < 300 
        };
        
        // Skip SSL certificate validation if insecure flag is set
        if (options.insecure) {
          console.log(chalk.yellow('Warning: SSL certificate verification is disabled. Use with caution.'));
          axiosOptions.httpsAgent = new (require('https')).Agent({ rejectUnauthorized: false });
        }
        
        const response = await axios.get(source, axiosOptions);
        content = response.data;
      } catch (error) {
        if (error.code === 'ECONNABORTED') {
          throw new Error('Request timed out. The server took too long to respond.');
        } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT' || 
                   error.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
          throw new Error(`SSL Certificate error: ${error.code}. Try using --insecure if you trust this source.`);
        } else if (error.response) {
          throw new Error(`Failed to fetch from URL: ${error.response.status} ${error.response.statusText}`);
        } else if (error.request) {
          throw new Error(`No response received from server. Check the URL and your network connection.`);
        } else {
          throw new Error(`Error fetching URL: ${error.message}`);
        }
      }
      
      // If response is already an object, return it directly
      if (typeof content === 'object' && content !== null) {
        return content;
      }
    } else {
      // Handle file input
      if (!await exists(source)) {
        throw new Error(`File does not exist: ${source}`);
      }
      content = fs.readFileSync(source, 'utf8');
    }
    
    // If content is a string, try to parse as JSON or YAML
    if (typeof content === 'string') {
      try {
        return JSON.parse(content);
      } catch (jsonError) {
        try {
          return jsyaml.load(content);
        } catch (yamlError) {
          throw new Error('Failed to parse content as JSON or YAML');
        }
      }
    }
    
    return content;
  } catch (error) {
    // Let the specific error handling from above propagate
    throw error;
  }
};

const handler = async (argv) => {
  try {
    const { type, source, output, outputFile, collectionName, insecure, groupBy } = argv;

    if (!type || type !== 'openapi') {
      console.error(chalk.red('Only OpenAPI import is supported currently'));
      process.exit(1);
    }

    if (!source) {
      console.error(chalk.red('Source file or URL is required'));
      process.exit(1);
    }

    if (!output && !outputFile) {
      console.error(chalk.red('Either --output or --output-file is required'));
      process.exit(1);
    }

    console.log(chalk.yellow(`Reading OpenAPI specification from ${source}...`));
    
    const openApiSpec = await readOpenApiFile(source, { insecure });
    
    if (!openApiSpec) {
      console.error(chalk.red('Failed to parse OpenAPI specification'));
      process.exit(1);
    }

    console.log(chalk.yellow('Converting OpenAPI specification to Bruno format...'));
    
    // Convert OpenAPI to Bruno format
    let brunoCollection = openApiToBruno(openApiSpec, { groupBy });
    
    // Override collection name if provided
    if (collectionName) {
      brunoCollection.name = collectionName;
    }

    if (outputFile) {
      // Save as JSON file
      const outputPath = path.resolve(outputFile);
      fs.writeFileSync(outputPath, JSON.stringify(brunoCollection, null, 2));
      console.log(chalk.green(`Bruno collection saved as JSON to ${outputPath}`));
    } else if (output) {
      const resolvedOutput = path.resolve(output);
      
      // Check if output is an existing directory
      const isOutputDirectory = await exists(resolvedOutput) && isDirectory(resolvedOutput);
      
      // Determine the final output directory
      let outputDir;
      if (isOutputDirectory) {
        // If output is an existing directory, use collection name to create a subdirectory
        const dirName = sanitizeName(brunoCollection.name);
        outputDir = path.join(resolvedOutput, dirName);
        
        // Check if this subfolder already exists
        if (await exists(outputDir)) {
          const dirContents = fs.readdirSync(outputDir);
          if (dirContents.length > 0) {
            console.error(chalk.red(`Output directory is not empty: ${outputDir}`));
            process.exit(1);
          }
        } else {
          // Create the subfolder
          fs.mkdirSync(outputDir, { recursive: true });
        }
      } else {
        // If output doesn't exist or is not a directory, use it directly
        outputDir = resolvedOutput;
        
        // Check if parent directory exists
        const parentDir = path.dirname(outputDir);
        if (!await exists(parentDir)) {
          console.error(chalk.red(`Parent directory does not exist: ${parentDir}`));
          process.exit(1);
        }
        
        fs.mkdirSync(outputDir, { recursive: true });
      }

      await createCollectionFromBrunoObject(brunoCollection, outputDir);
      console.log(chalk.green(`Bruno collection created at ${outputDir}`));
    }
  } catch (error) {
    console.error(chalk.red(`Error: ${error.message}`));
    process.exit(1);
  }
};

module.exports = {
  command,
  desc,
  builder,
  handler,
  isUrl,
  readOpenApiFile
}; 