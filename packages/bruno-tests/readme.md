# bruno-tests

This package is used to test the Bruno CLI.
We have a collection that sits in the `collection` directory.

### Test Server

This will start the server on port 80 which exposes endpoints that the collection will hit.

```bash
# install node dependencies
npm install

# start server
npm start
```

### Run Bru CLI on Collection

```bash
cd collection

# run collection against local server
node ../../bruno-cli/bin/bru.js run --env Local --output junit.xml --format junit

# run collection against prod server hosted at https://testbench.usebruno.com
node ../../bruno-cli/bin/bru.js run --env Prod --output junit.xml --format junit
```

### License

[MIT](LICENSE)
