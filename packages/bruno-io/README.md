# Bruno IO

Writes a converted collection to disk.

## Usage

```javascript
const { openApiToBruno } = require('@usebruno/converters');
const { writeCollection } = require('@usebruno/io');

const main = async () => {
  const collection = openApiToBruno(openApiSpecification);
  await writeCollection(collection, './my-collection');
};

main();
```

`outputDir` is created if it does not exist. If it already exists it must be empty, otherwise the call rejects with an error whose `code` is `'ENOTEMPTY'` and nothing is written.

## API

- `writeCollection(collection, outputDir)`: Write a whole collection to `outputDir` in `yml` format. Resolves to `outputDir`. `outputDir` must be missing or empty; otherwise it rejects with `code: 'ENOTEMPTY'`

## Building

The build and the tests resolve `@usebruno/filestore` from its `dist`, so build filestore first:

```bash
npm run build:bruno-filestore
npm run build:bruno-io
```
