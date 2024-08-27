# bruno-cli

With Bruno CLI, you can now run your API collections with ease using simple command line commands.

This makes it easier to test your APIs in different environments, automate your testing process, and integrate your API tests with your continuous integration and deployment workflows.

## Installation

To install the Bruno CLI, use the node package manager of your choice, such as NPM:

```bash
npm install -g @usebruno/cli
```

## Getting started

Navigate to the directory where your API collection resides, and then run:

```bash
bru run
```

This command will run all the requests in your collection. You can also run a single request by specifying its filename:

```bash
bru run request.bru
```

Or run all requests in a collection's subfolder:

```bash
bru run folder
```

If you need to use an environment, you can specify it with the `--env` option:

```bash
bru run folder --env Local
```

If you need to collect the results of your API tests, you can specify the `--output` option:

```bash
bru run folder --output results.json
```

If you need to run a set of requests that connect to peers with both publicly and privately signed certificates respectively, you can add private CA certificates via the `--cacert` option. By default, these certificates will be used in addition to the default truststore:

```bash
bru run folder --cacert myCustomCA.pem
```

If you need to limit the trusted CA to a specified set when validating the request peer, provide them via `--cacert` and in addition use `--ignore-truststore` to disable the default truststore:

```bash
bru run request.bru --cacert myCustomCA.pem --ignore-truststore
```

## Scripting

Bruno cli returns the following exit status codes:

- `0` -- execution successful
- `1` -- an assertion, test, or request in the executed collection failed
- `2` -- the specified output directory does not exist
- `3` -- the request chain seems to loop endlessly
- `4` -- bru was called outside of a collection root directory
- `5` -- the specified input file does not exist
- `6` -- the specified environment does not exist
- `7` -- the environment override was not a string or object
- `8` -- an environment override is malformed
- `9` -- an invalid output format was requested
- `255` -- another error occurred

## Demo

![demo](assets/images/cli-demo.png)

## Support

If you encounter any issues or have any feedback or suggestions, please raise them on our [GitHub repository](https://github.com/usebruno/bruno)

Thank you for using Bruno CLI!

## Changelog

<!-- An absolute link is used here because npm treats links differently -->

See [https://github.com/usebruno/bruno/releases](https://github.com/usebruno/bruno/releases)

## License

[MIT](license.md)
