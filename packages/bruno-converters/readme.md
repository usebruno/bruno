# bruno-converters

The converters package is responsible for converting collections from one format to a Bruno collection.
It can be used as a standalone package or as a part of the Bruno framework.

## Installation

```bash
npm install @bruno-converters
```

## Usage

### Convert Postman collection to Bruno collection

```javascript
const { importPostmanCollection, exportBrunoCollection } = require('@usebruno/converters');

// Convert Postman collection to Bruno collection
const postmanCollectionFile = './example.postman_collection.json';
const brunoCollection = await importPostmanCollection(postmanCollectionFile, {
  enablePostmanTranslations: { enabled: true }
});

// Export Bruno collection as a JSON file
exportBrunoCollection(brunoCollection);
```

### Convert Postman Environment to Bruno Environment

```javascript
const { importPostmanEnvironment } = require('@usebruno/converters');

const postmanEnvFile = './example.postman_environment.json';
const brunoEnvironment = await importPostmanEnvironment(postmanEnvFile);
```

### Convert Insomnia collection to Bruno collection

```javascript
import { importInsomniaCollection, exportBrunoCollection } from '@usebruno/converters';

const insomniaCollectionFile = './example.insomnia.json';
const brunoCollection = await importInsomniaCollection(insomniaCollectionFile);

exportBrunoCollection(brunoCollection);
```

### Convert OpenAPI specification to Bruno collection

```javascript
import { importOpenAPICollection, exportBrunoCollection } from '@usebruno/converters';

const openAPIFile = './example.openapi.yaml';
const brunoCollection = await importOpenAPICollection(openAPIFile);

exportBrunoCollection(brunoCollection);
```
