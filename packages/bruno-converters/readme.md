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
const fs = require('fs/promises');
const path = require('path');

async function convertPostmanToBruno(inputFile, outputFile) {
  try {
    // Read Postman collection file
    const inputData = await fs.readFile(inputFile, 'utf8');
    
    // Convert to Bruno collection
    const brunoCollection = await postmanToBruno(JSON.parse(inputData));
    
    // Save Bruno collection
    await fs.writeFile(outputFile, JSON.stringify(brunoCollection, null, 2));
    
    console.log('Conversion successful!');
  } catch (error) {
    console.error('Error during conversion:', error);
  }
}

// Usage
const inputFilePath = path.resolve(__dirname, 'demo_collection.postman_collection.json');
const outputFilePath = path.resolve(__dirname, 'bruno-collection.json');

convertPostmanToBruno(inputFilePath, outputFilePath);

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
import fs from 'fs/promises';

async function importWSDL() {
  try {
    // Read WSDL file
    const wsdlContent = await fs.readFile('service.wsdl', 'utf8');
    
    // Convert to Bruno collection
    const brunoCollection = await wsdlToBruno(wsdlContent);
    
    // Save Bruno collection
    await fs.writeFile('soap-collection.json', JSON.stringify(brunoCollection, null, 2));
    
    console.log('WSDL import successful!');
  } catch (error) {
    console.error('Error during WSDL import:', error);
  }
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
