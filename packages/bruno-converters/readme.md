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
import { insomniaToBruno } from '@usebruno/converters';

const brunoCollection = insomniaToBruno(insomniaCollection);
```

### Convert OpenAPI specification to Bruno collection

```javascript
import { openApiToBruno } from '@usebruno/converters';

const brunoCollection = openApiToBruno(openApiSpecification);
```

### Convert YAML OpenAPI specification to Bruno collection

```javascript
import { openApiToBruno, yamlToJson } from '@usebruno/converters';

const jsonSpec = yamlToJson(yamlString)

const brunoCollection = openApiToBruno(jsonSpec);
```

### Convert YAML to JSON

```javascript
import { yamlToJson } from '@usebruno/converters';

// Convert YAML string to JSON object
const yamlString = `
name: Example
version: 1.0
items:
  - id: 1
    title: Item 1
  - id: 2
    title: Item 2
`;

const jsonObject = yamlToJson(yamlString);
console.log(jsonObject);
// Output: { name: 'Example', version: 1.0, items: [ { id: 1, title: 'Item 1' }, { id: 2, title: 'Item 2' } ] }
```

## Example 

```bash copy

const { postmanToBruno } = require('@usebruno/converters');
const fs = require('fs/promises');
const path = require('path');

async function convertPostmanToBruno(inputFile, outputFile) {
  try {
    // Read Postman collection file
    const inputData = await fs.readFile(inputFile, 'utf8');
    
    // Convert to Bruno collection
    const brunoCollection = postmanToBruno(JSON.parse(inputData));
    
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