#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const peggy = require('peggy');

/**
 * Peggy Code Generator Script
 *
 * This script takes JSON configuration and generates peggy parser code.
 * It can work with either:
 * 1. A single JSON config file
 * 2. Multiple JSON config files in a directory
 * 3. Static JSON config passed as argument
 */

function generatePeggyCode(config, basePath = process.cwd()) {
  try {
    // Validate required config properties
    if (!config.input) {
      throw new Error('Config must specify "input" property (peggy grammar file)');
    }
    if (!config.output) {
      throw new Error('Config must specify "output" property (output file path)');
    }

    const inputPath = path.resolve(basePath, config.input);
    const outputPath = path.resolve(basePath, config.output);

    // Read the peggy grammar file
    if (!fs.existsSync(inputPath)) {
      throw new Error(`Input grammar file not found: ${inputPath}`);
    }

    const grammarSource = fs.readFileSync(inputPath, 'utf8');

    // Configure peggy options
    const peggyOptions = {
      format: config.format || 'commonjs',
      output: 'source'
    };

    // Add start rule if specified
    if (config.startRule) {
      peggyOptions.allowedStartRules = [config.startRule];
    }

    // Generate the parser code
    console.log(`Generating parser from ${config.input} -> ${config.output}`);
    const parserCode = peggy.generate(grammarSource, peggyOptions);

    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write the generated code
    fs.writeFileSync(outputPath, parserCode, 'utf8');
    console.log(`✓ Successfully generated: ${config.output}`);

    return true;
  } catch (error) {
    console.error(`✗ Error generating ${config.output || 'parser'}:`, error.message);
    return false;
  }
}

function loadJsonConfig(configPath) {
  try {
    const configContent = fs.readFileSync(configPath, 'utf8');
    return JSON.parse(configContent);
  } catch (error) {
    console.error(`Error loading config file ${configPath}:`, error.message);
    return null;
  }
}

function processConfigFile(configPath) {
  const config = loadJsonConfig(configPath);
  if (!config) return false;

  const basePath = path.dirname(configPath);
  return generatePeggyCode(config, basePath);
}

function processConfigDirectory(dirPath) {
  try {
    const files = fs.readdirSync(dirPath);
    const configFiles = files.filter(file =>
      file.endsWith('.json') || file.endsWith('.cjs')
    );

    if (configFiles.length === 0) {
      console.log(`No config files found in ${dirPath}`);
      return true;
    }

    let allSuccessful = true;
    for (const configFile of configFiles) {
      const configPath = path.join(dirPath, configFile);

      // Handle .cjs files (CommonJS modules)
      if (configFile.endsWith('.cjs')) {
        try {
          const absoluteConfigPath = path.resolve(configPath);
          delete require.cache[require.resolve(absoluteConfigPath)];
          const config = require(absoluteConfigPath);
          const success = generatePeggyCode(config, dirPath);
          allSuccessful = allSuccessful && success;
        } catch (error) {
          console.error(`Error processing ${configFile}:`, error.message);
          allSuccessful = false;
        }
      } else {
        // Handle .json files
        const success = processConfigFile(configPath);
        allSuccessful = allSuccessful && success;
      }
    }

    return allSuccessful;
  } catch (error) {
    console.error(`Error processing directory ${dirPath}:`, error.message);
    return false;
  }
}

function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log(`
Peggy Code Generator

Usage:
  node peggy-codegen.js <config-file>           # Process single config file
  node peggy-codegen.js <config-directory>     # Process all configs in directory
  node peggy-codegen.js --json '<json-config>' # Process JSON config directly

Config format (JSON or CommonJS):
{
  "input": "grammar.peggy",      // Input peggy grammar file
  "output": "parser.js",         // Output parser file
  "format": "commonjs",          // Output format (optional, defaults to commonjs)
  "startRule": "StartRule"       // Start rule name (optional)
}

Examples:
  node peggy-codegen.js ./config.json
  node peggy-codegen.js ./src/parsers/
  node peggy-codegen.js --json '{"input":"grammar.peggy","output":"parser.js"}'
`);
    process.exit(1);
  }

  const target = args[0];

  // Handle direct JSON config
  if (target === '--json' && args[1]) {
    try {
      const config = JSON.parse(args[1]);
      const success = generatePeggyCode(config);
      process.exit(success ? 0 : 1);
    } catch (error) {
      console.error('Error parsing JSON config:', error.message);
      process.exit(1);
    }
  }

  // Handle file or directory
  if (!fs.existsSync(target)) {
    console.error(`Target not found: ${target}`);
    process.exit(1);
  }

  const stats = fs.statSync(target);
  let success;

  if (stats.isDirectory()) {
    success = processConfigDirectory(target);
  } else {
    success = processConfigFile(target);
  }

  process.exit(success ? 0 : 1);
}

// Run the script if called directly
if (require.main === module) {
  main();
}
