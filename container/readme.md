# Bruno CLI Container

A minimal Docker image for running the [Bruno CLI](https://github.com/usebruno/bruno) tool.

## Pre-built images

Pre-built images are available at [ghcr.io/usebruno/bruno-cli](https://github.com/usebruno/bruno/pkgs/container/bruno-cli):

```sh
docker pull ghcr.io/usebruno/bruno-cli:latest
```

## Build the image yourself

```sh
docker build -t bruno-cli .
```

### Override Bruno Version

To use a different Bruno CLI version:

```sh
docker build --build-arg BRUNO_VERSION=3.2.2 -t bruno-cli:3.2.2 .
```

## Usage

### Run Bruno CLI

You can run any `bru` command. For example, to run a collection:

```sh
docker run --rm -v "$(pwd):/bruno" ghcr.io/usebruno/bruno-cli run <collection>
```

> `-v $(pwd):/bruno` mounts your current directory into the working directory of the container.

More information on the usage of Bruno CLI can be found in [the official documentation](https://docs.usebruno.com/bru-cli/commandOptions).
