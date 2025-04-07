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
