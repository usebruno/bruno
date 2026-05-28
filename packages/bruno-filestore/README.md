# Bruno Filestore

A generic file storage and parsing package for Bruno API client.

## Purpose

This package abstracts the file format operations for Bruno, providing a clean interface for parsing and stringifying Bruno requests, collections, folders, and environments.

## Features

- Format-agnostic APIs for file operations
- Currently supports Bruno's custom `.bru` format
- Designed for future extensibility to support YAML and other formats

## Usage

```javascript
const {
  parseRequest,
  stringifyRequest,
  parseCollection,
  stringifyCollection,
  parseEnvironment,
  stringifyEnvironment,
  parseDotEnv
} = require('@usebruno/filestore');

// Parse a .bru request file
const requestData = parseRequest(bruContent);

// Stringify request data to .bru format
const bruContent = stringifyRequest(requestData);

// Example with future format support (not yet implemented)
const requestData = parseRequest(yamlContent, { format: 'yaml' });
```

## API

The package provides the following functions:

- `parseRequest(content, options = { format: 'bru' })`: Parse request file content
- `stringifyRequest(requestObj, options = { format: 'bru' })`: Convert request object to file content
- `parseCollection(content, options = { format: 'bru' })`: Parse collection file content
- `stringifyCollection(collectionObj, options = { format: 'bru' })`: Convert collection object to file content
- `parseFolder(content, options = { format: 'bru' })`: Parse folder file content
- `stringifyFolder(folderObj, options = { format: 'bru' })`: Convert folder object to file content
- `parseEnvironment(content, options = { format: 'bru' })`: Parse environment file content
- `stringifyEnvironment(envObj, options = { format: 'bru' })`: Convert environment object to file content
- `parseDotEnv(content)`: Parse .env file content 