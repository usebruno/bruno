const fs = require('fs');
const path = require('path');
const { pathToFileURL, fileURLToPath } = require('url');
const chalk = require('chalk');
const jsyaml = require('js-yaml');
const axios = require('axios');
const { openApiToBruno, wsdlToBruno, postmanToBruno, postmanToBrunoEnvironment } = require('@usebruno/converters');
const { coerceEnvName, dedupeImportedSecrets, generateUniqueName } = require('@usebruno/common').utils;
const { exists, isDirectory, sanitizeName, canonicalPath } = require('../utils/filesystem');
const { writeEnvironmentFile } = require('../utils/environment');
const { getCollectionFormat } = require('../utils/collection');
const { formatImportSummary, formatImportIssues, formatPackageReport, hasImportErrors } = require('../utils/import-report');
const { writeCollectionToDiskLegacy } = require('@usebruno/filestore');

const command = 'import <type>';
const desc = 'Import a collection (OpenAPI, WSDL, Postman) or a Postman environment from other formats';

const IMPORT_TYPES = ['openapi', 'wsdl', 'postman', 'postman-env'];
const COLLECTION_FORMATS = ['bru', 'opencollection'];

const WSDL_MAX_SCHEMA_FILE_SIZE = 10 * 1024 * 1024;
const WSDL_SCHEMA_EXTENSIONS = ['.xsd', '.wsdl'];

const builder = (yargs) => {
  yargs
    .positional('type', {
      describe: 'Type of collection or environment to import',
      type: 'string',
      choices: IMPORT_TYPES
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
    .option('collection-format', {
      describe: 'Format of the imported collection (bru or opencollection). If not specified, the default is `opencollection`. Not supported for postman and postman-env, which always write opencollection',
      type: 'string',
      choices: COLLECTION_FORMATS
    })
    .option('insecure', {
      type: 'boolean',
      describe: 'Skip SSL certificate verification when fetching from URLs',
      default: false
    })
    .option('group-by', {
      alias: 'g',
      describe: 'How to group the imported requests: "tags" groups by OpenAPI tags, "path" groups by URL path structure (openapi only)',
      type: 'string',
      choices: ['tags', 'path'],
      default: 'tags'
    })
    .option('preserve-scripts', {
      describe: 'Preserve scripts (keep Postman scripts verbatim, no pm.* → bru.* translation) (postman only)',
      type: 'boolean',
      default: false
    })
    .option('environment', {
      alias: 'e',
      describe: 'Postman environment export(s) to convert alongside the collection (postman only)',
      type: 'array'
    })
    .example('$0 import openapi --source api.yml --output ~/Desktop/my-collection --collection-name "My API"')
    .example('$0 import openapi -s api.yml -o ~/Desktop/my-collection -n "My API"')
    .example('$0 import openapi --source https://example.com/api-spec.json --output ~/Desktop --collection-name "Remote API"')
    .example('$0 import openapi --source https://self-signed.example.com/api.json --insecure --output ~/Desktop')
    .example('$0 import openapi --source api.yml --output-file ~/Desktop/my-collection.json --collection-name "My API"')
    .example('$0 import openapi -s api.yml -f ~/Desktop/my-collection.json -n "My API"')
    .example('$0 import openapi --source api.yml --output ~/Desktop/my-collection --group-by path')
    .example('$0 import openapi -s api.yml -o ~/Desktop/my-collection -g tags')
    .example('$0 import wsdl --source service.wsdl --output ~/Desktop/soap-collection --collection-name "SOAP Service"')
    .example('$0 import wsdl -s https://example.com/service.wsdl -o ~/Desktop -n "Remote SOAP Service"')
    .example('$0 import postman --source my-api.postman_collection.json --output ~/Desktop/my-api')
    .example('$0 import postman -s my-api.postman_collection.json -o ~/Desktop/my-api -n "My API"')
    .example('$0 import postman -s https://example.com/my-api.postman_collection.json -o ~/Desktop/my-api --preserve-scripts')
    .example('$0 import postman -s my-api.postman_collection.json -o ~/Desktop/my-api -e staging.postman_environment.json -e prod.postman_environment.json')
    .example('$0 import postman-env --source staging.postman_environment.json --output ~/Desktop/my-api');
};

const isUrl = (str) => {
  try {
    const url = new URL(str);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch (error) {
    return false;
  }
};

/**
 * Fetches an import source over http(s) and returns the response body as axios parsed it (an object
 * for a JSON response, otherwise a string).
 */
const fetchSourceFromUrl = async (source, options = {}) => {
  try {
    const axiosOptions = {
      timeout: 30000, // 30 second timeout
      maxContentLength: 10 * 1024 * 1024,
      validateStatus: (status) => status >= 200 && status < 300
    };

    // Skip SSL certificate validation if insecure flag is set
    if (options.insecure) {
      console.log(chalk.yellow('Warning: SSL certificate verification is disabled. Use with caution.'));
      axiosOptions.httpsAgent = new (require('https')).Agent({ rejectUnauthorized: false });
    }

    const response = await axios.get(source, axiosOptions);
    return response.data;
  } catch (error) {
    if (error.code === 'ECONNABORTED') {
      throw new Error('Request timed out. The server took too long to respond.');
    } else if (error.code === 'CERT_HAS_EXPIRED' || error.code === 'DEPTH_ZERO_SELF_SIGNED_CERT'
      || error.code === 'ERR_TLS_CERT_ALTNAME_INVALID') {
      throw new Error(`SSL Certificate error: ${error.code}. Try using --insecure if you trust this source.`);
    } else if (error.response) {
      throw new Error(`Failed to fetch from URL: ${error.response.status} ${error.response.statusText}`);
    } else if (error.request) {
      throw new Error(`No response received from server. Check the URL and your network connection.`);
    } else {
      throw new Error(`Error fetching URL: ${error.message}`);
    }
  }
};

const readOpenApiFile = async (source, options = {}) => {
  try {
    let content;

    if (isUrl(source)) {
      // Handle URL input
      console.log(chalk.yellow(`Fetching specification from URL: ${source}`));
      content = await fetchSourceFromUrl(source, options);

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

const readWSDLFile = async (source, options = {}) => {
  try {
    let content;

    if (isUrl(source)) {
      // Handle URL input
      console.log(chalk.yellow(`Fetching WSDL from URL: ${source}`));
      content = await fetchSourceFromUrl(source, options);
    } else {
      // Handle file input
      if (!await exists(source)) {
        throw new Error(`File does not exist: ${source}`);
      }
      content = fs.readFileSync(source, 'utf8');
    }

    // WSDL files are XML, so we return the content as a string
    if (typeof content === 'string') {
      return content;
    }

    throw new Error('WSDL content must be a string');
  } catch (error) {
    // Let the specific error handling from above propagate
    throw error;
  }
};

/**
 * Reads a Postman collection or environment export from a file or http(s) URL.
 */
const readPostmanFile = async (source, options = {}) => {
  let content;

  if (isUrl(source)) {
    console.log(chalk.yellow(`Fetching Postman export from URL: ${source}`));
    content = await fetchSourceFromUrl(source, options);

    if (typeof content === 'object' && content !== null) {
      return content;
    }
  } else {
    if (!await exists(source)) {
      throw new Error(`File does not exist: ${source}`);
    }
    content = fs.readFileSync(source, 'utf8');
  }

  try {
    return JSON.parse(content);
  } catch (error) {
    throw new Error(`Failed to parse Postman JSON from ${source}`);
  }
};

const resolveLocalWsdlSchemaRef = async (baseUri, ref) => {
  if (typeof baseUri !== 'string' || !baseUri.length) {
    throw new Error('Invalid base URI for schema resolution');
  }
  if (typeof ref !== 'string' || !ref.length) {
    throw new Error('Invalid schema reference');
  }

  const base = path.isAbsolute(baseUri) ? pathToFileURL(baseUri) : new URL(baseUri);
  const target = new URL(ref, base);

  if (target.protocol !== 'file:' || target.host !== base.host) {
    throw new Error(`Remote schema references are not supported (${ref})`);
  }

  const targetPath = fileURLToPath(target);
  if (!WSDL_SCHEMA_EXTENSIONS.includes(path.extname(targetPath).toLowerCase())) {
    throw new Error(`Schema references must point at a ${WSDL_SCHEMA_EXTENSIONS.join('/')} file (${ref})`);
  }

  const stats = fs.statSync(targetPath);
  if (!stats.isFile()) {
    throw new Error(`Schema reference is not a file: ${targetPath}`);
  }
  if (stats.size > WSDL_MAX_SCHEMA_FILE_SIZE) {
    throw new Error(`Schema file exceeds the ${WSDL_MAX_SCHEMA_FILE_SIZE / (1024 * 1024)}MB limit: ${targetPath}`);
  }

  return {
    text: fs.readFileSync(targetPath, 'utf8'),
    uri: target.href,
    key: pathToFileURL(canonicalPath(targetPath)).href
  };
};

/**
 * Picks the directory a collection is written to. An existing directory gets a new, empty
 * subdirectory named after the collection; any other path is used as is and its parent must exist.
 */
const resolveCollectionOutputDir = async (output, collectionName) => {
  const resolvedOutput = path.resolve(output);
  const isOutputDirectory = await exists(resolvedOutput) && isDirectory(resolvedOutput);

  if (isOutputDirectory) {
    const outputDir = path.join(resolvedOutput, sanitizeName(collectionName));

    if (await exists(outputDir)) {
      if (fs.readdirSync(outputDir).length > 0) {
        throw new Error(`Output directory is not empty: ${outputDir}`);
      }
    } else {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    return outputDir;
  }

  const parentDir = path.dirname(resolvedOutput);
  if (!await exists(parentDir)) {
    throw new Error(`Parent directory does not exist: ${parentDir}`);
  }

  fs.mkdirSync(resolvedOutput, { recursive: true });
  return resolvedOutput;
};

/**
 * Converts a Postman environment export with the same name check and secret de-duplication as the
 * app's environment importer.
 */
const convertPostmanEnvironment = async (source, { insecure }) => {
  const postmanEnvironment = await readPostmanFile(source, { insecure });
  const environment = postmanToBrunoEnvironment(postmanEnvironment);
  const name = coerceEnvName(environment.name);
  if (name === null) {
    throw new Error('Invalid environment: missing or invalid name');
  }

  return { name, variables: dedupeImportedSecrets(environment.variables) };
};

const importPostmanCollection = async (source, { insecure, preserveScripts, environmentSources = [] }) => {
  const postmanCollection = await readPostmanFile(source, { insecure });
  const { collection, issues, translationIssues } = await postmanToBruno(postmanCollection, {
    preserveScripts,
    logTranslationFailures: false
  });

  for (const environmentSource of environmentSources) {
    const environment = await convertPostmanEnvironment(environmentSource, { insecure });
    const takenNames = collection.environments.map((env) => env.name);
    const name = generateUniqueName(sanitizeName(environment.name), (candidate) => takenNames.includes(candidate));
    collection.environments.push({ ...environment, name });
  }

  return { collection, issues: [...issues, ...translationIssues] };
};

const writeBrunoCollection = async (collection, { output, outputFile, collectionFormat = 'opencollection' }) => {
  if (outputFile) {
    // The Postman package report is console output, not part of the collection.
    const collectionToSave = { ...collection };
    delete collectionToSave.packageReport;
    const outputPath = path.resolve(outputFile);
    fs.writeFileSync(outputPath, JSON.stringify(collectionToSave, null, 2));
    console.log(chalk.green(`Bruno collection saved as JSON to ${outputPath}`));
    return;
  }

  const outputDir = await resolveCollectionOutputDir(output, collection.name);
  await writeCollectionToDiskLegacy(collection, outputDir, {
    format: collectionFormat === 'opencollection' ? 'yml' : 'bru'
  });
  console.log(chalk.green(`Bruno collection created at ${outputDir}`));
};

/**
 * Prints what the import produced and returns whether any item was skipped. The package report is
 * informational and never counts as an error.
 */
const reportImport = (collection, issues) => {
  const lines = [formatImportSummary(collection), ...formatImportIssues(issues), ...formatPackageReport(collection.packageReport)];
  lines.forEach((line) => console.log(line));
  return hasImportErrors(issues);
};

const importPostmanEnvironment = async ({ source, output, outputFile, insecure }) => {
  if (outputFile) {
    throw new Error('--output-file is not supported for postman-env');
  }
  if (!output) {
    throw new Error('--output is required for postman-env');
  }

  const collectionDir = path.resolve(output);
  const format = getCollectionFormat(collectionDir);
  if (!format) {
    throw new Error(`Not a Bruno collection (no opencollection.yml or bruno.json): ${collectionDir}`);
  }
  if (format !== 'yml') {
    throw new Error(`postman-env supports only OpenCollection (yml) collections: ${collectionDir}`);
  }

  console.log(chalk.yellow(`Reading Postman environment from ${source}...`));
  const environment = await convertPostmanEnvironment(source, { insecure });
  const { name, filePath } = writeEnvironmentFile(environment, path.join(collectionDir, 'environments'), { format });
  console.log(chalk.green(`Environment "${name}" written to ${filePath}`));
};

const handler = async (argv) => {
  try {
    const { type, source, output, collectionFormat, outputFile, collectionName, insecure, groupBy, preserveScripts, environment } = argv;

    if (!type || !IMPORT_TYPES.includes(type)) {
      console.error(chalk.red(`Import type must be one of: ${IMPORT_TYPES.join(', ')}`));
      process.exit(1);
    }

    if (!source) {
      console.error(chalk.red('Source file or URL is required'));
      process.exit(1);
    }

    if ((type === 'postman' || type === 'postman-env') && collectionFormat) {
      throw new Error(`--collection-format is not supported for ${type}; Postman imports are always written as OpenCollection (yml)`);
    }

    if (type === 'postman-env') {
      await importPostmanEnvironment({ source, output, outputFile, insecure });
      return;
    }

    if (!output && !outputFile) {
      console.error(chalk.red('Either --output or --output-file is required'));
      process.exit(1);
    }

    if (type === 'postman') {
      console.log(chalk.yellow(`Reading Postman collection from ${source}...`));
      const { collection, issues } = await importPostmanCollection(source, {
        insecure,
        preserveScripts,
        environmentSources: environment
      });

      if (collectionName) {
        collection.name = collectionName;
      }

      await writeBrunoCollection(collection, { output, outputFile });
      const hasErrors = reportImport(collection, issues);
      if (hasErrors) {
        process.exit(1);
      }
      return;
    }

    let brunoCollection;

    if (type === 'openapi') {
      console.log(chalk.yellow(`Reading OpenAPI specification from ${source}...`));

      const openApiSpec = await readOpenApiFile(source, { insecure });

      if (!openApiSpec) {
        console.error(chalk.red('Failed to parse OpenAPI specification'));
        process.exit(1);
      }

      console.log(chalk.yellow('Converting OpenAPI specification to Bruno format...'));

      // Convert OpenAPI to Bruno format
      brunoCollection = openApiToBruno(openApiSpec, { groupBy });
    } else if (type === 'wsdl') {
      console.log(chalk.yellow(`Reading WSDL from ${source}...`));

      const wsdlContent = await readWSDLFile(source, { insecure });

      if (!wsdlContent) {
        console.error(chalk.red('Failed to read WSDL file'));
        process.exit(1);
      }

      console.log(chalk.yellow('Converting WSDL to Bruno format...'));

      // Convert WSDL to Bruno format
      const wsdlImportOptions = isUrl(source)
        ? {}
        : { uri: path.resolve(source), resolve: resolveLocalWsdlSchemaRef };
      brunoCollection = await wsdlToBruno(wsdlContent, wsdlImportOptions);
    }

    // Override collection name if provided
    if (collectionName) {
      brunoCollection.name = collectionName;
    }

    await writeBrunoCollection(brunoCollection, { output, outputFile, collectionFormat });
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
  readOpenApiFile,
  readWSDLFile,
  resolveLocalWsdlSchemaRef
};
