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
const { importPostmanCollection, exportBrunoCollection } = require('@bruno-converters');

// Convert Postman collection to Bruno collection
const postmanCollectionFile = './example.postman_collection.json';
const brunoCollection = await importPostmanCollection(postmanCollectionFile, {
  enablePostmanTranslations: { enabled: true }
});

// Export Bruno collection as a JSON file
exportBrunoCollection(brunoCollection);
```
