# Bruno IO

Writes a converted collection to disk.

## Usage

```javascript
const { openApiToBruno } = require('@usebruno/converters');
const { writeCollectionToDisk } = require('@usebruno/io');

const main = async () => {
  const collection = openApiToBruno(openApiSpecification);
  await writeCollectionToDisk(collection, './my-collection');
};

main();
```

`outputDir` is created if it does not exist. If it already exists it must be empty, otherwise the call rejects with an error whose `code` is `'ENOTEMPTY'` and nothing is written.

## API

- `writeCollectionToDisk(collection, outputDir)`: Write a whole collection to `outputDir` in `yml` format. Resolves to `outputDir`. `outputDir` must be missing or empty; otherwise it rejects with `code: 'ENOTEMPTY'`
- `writeCollectionToDiskLegacy(collection, outputDir, options = { format: 'yml' })`: Same as `writeCollectionToDisk`, but `options.format` picks the on-disk format (`'bru'` or `'yml'`)

## Building

The build and the tests resolve `@usebruno/filestore` from its `dist`, so build filestore first:

```bash
npm run build:bruno-filestore
npm run build:bruno-io
```
