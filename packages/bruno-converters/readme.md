# bruno-converters

The converters package is responsible for converting collections from one format to a Bruno collection.
It can be used as a standalone package or as a part of the Bruno framework.

## Installation

```bash
npm install @usebruno/converters
```

## Usage

### Convert Postman collection to Bruno collection

```javascript
const { postmanToBruno } = require('@usebruno/converters');

// Convert Postman collection to Bruno collection
const brunoCollection = postmanToBruno(postmanCollection);
```

### Convert Postman Environment to Bruno Environment

```javascript
const { postmanToBrunoEnvironment } = require('@usebruno/converters');

const brunoEnvironment = postmanToBrunoEnvironment(postmanEnvironment);
```

### Convert Insomnia collection to Bruno collection

```javascript
const { insomniaToBruno } = require('@usebruno/converters');

const brunoCollection = insomniaToBruno(insomniaCollection);
```

### Convert OpenAPI specification to Bruno collection

```javascript
const { openApiToBruno } = require('@usebruno/converters');

const brunoCollection = openApiToBruno(openApiSpecification);
```

### Convert WSDL file to Bruno collection

```javascript
import { wsdlToBruno } from '@usebruno/converters';

const brunoCollection = await wsdlToBruno(wsdlContent);
```

## Example 

```javascript

const { postmanToBruno } = require('@usebruno/converters');
const { writeCollectionToDisk } = require('@usebruno/filestore');
const fs = require('fs/promises');

async function convertPostmanToBruno(inputFile, outputDir) {
  const inputData = await fs.readFile(inputFile, 'utf8');

  const collection = await postmanToBruno(JSON.parse(inputData));
  // Writes YAML (OpenCollection) files by default
  await writeCollectionToDisk(collection, outputDir);
  // Use the writeCollectionToDiskLegacy to write .bru files instead
  // await writeCollectionToDiskLegacy(collection, outputDir, { format: 'bru' });
}

convertPostmanToBruno('demo_collection.postman_collection.json', './bruno-collection');

``` 

## WSDL Import Features

The WSDL importer supports the following features:

- **Service Discovery**: Automatically extracts service endpoints from WSDL definitions
- **Operation Mapping**: Converts WSDL operations to Bruno HTTP requests
- **SOAP Envelope Generation**: Creates proper SOAP envelopes for each operation
- **Header Configuration**: Sets up appropriate Content-Type and SOAPAction headers
- **Environment Variables**: Creates environment variables for service base URLs
- **Folder Organization**: Groups operations by port type for better organization

### WSDL Import Example

```javascript
import { wsdlToBruno } from '@usebruno/converters';
import { writeCollectionToDisk } from '@usebruno/filestore';
import fs from 'fs/promises';

async function importWSDL() {
  const wsdlContent = await fs.readFile('service.wsdl', 'utf8');

  const collection = await wsdlToBruno(wsdlContent);
  // Writes YAML (OpenCollection) files by default
  await writeCollectionToDisk(collection, './soap-collection');
  // Use the writeCollectionToDiskLegacy to write .bru files instead
  // await writeCollectionToDiskLegacy(collection, './soap-collection', { format: 'bru' });
}

importWSDL();
```

### CLI Usage

You can also use the Bruno CLI to import WSDL files:

```bash
# Import WSDL file to a directory
bruno import wsdl --source service.wsdl --output ~/Desktop/soap-collection --collection-name "SOAP Service"

# Import WSDL from URL
bruno import wsdl --source https://example.com/service.wsdl --output ~/Desktop --collection-name "Remote SOAP Service"

# Import WSDL and save as JSON file
bruno import wsdl --source service.wsdl --output-file ~/Desktop/soap-collection.json --collection-name "SOAP Service"
```

## Supported Formats

- **Postman Collections** (v2.1)
- **Insomnia Collections** (v4 and v5)
- **OpenAPI Specifications** (v3.0)
- **WSDL Files** (Web Services Description Language)

## Dependencies

- `lodash` - Utility functions
- `nanoid` - UUID generation
- `js-yaml` - YAML parsing
- `xml2js` - XML parsing for WSDL
- `@usebruno/schema` - Schema validation
