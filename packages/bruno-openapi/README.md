# @usebruno/openapi

A package for converting between OpenAPI specifications and Bruno collections.

## Installation

```bash
npm install @usebruno/openapi
```

## Usage

### Convert OpenAPI to Bruno Collection

```javascript
const { convertOpenApiToBruno } = require('@usebruno/openapi');

// OpenAPI spec as object or string (JSON/YAML)
const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'My API',
    version: '1.0.0'
  },
  // ... rest of your OpenAPI spec
};

// Convert OpenAPI to Bruno collection
convertOpenApiToBruno(openApiSpec)
  .then(brunoCollection => {
    console.log(brunoCollection);
  })
  .catch(error => {
    console.error('Error converting OpenAPI to Bruno:', error);
  });
```

### Convert Bruno Collection to OpenAPI

```javascript
const { convertBrunoToOpenApi } = require('@usebruno/openapi');

// Bruno collection
const brunoCollection = {
  name: 'My Collection',
  uid: '123',
  version: '1',
  items: [
    // ... your Bruno collection items
  ],
  environments: [
    // ... your Bruno environments
  ]
};

// Convert Bruno collection to OpenAPI (returns YAML string by default)
const openApiYaml = convertBrunoToOpenApi(brunoCollection);
console.log(openApiYaml);

// Convert Bruno collection to OpenAPI as JavaScript object
const openApiObject = convertBrunoToOpenApi(brunoCollection, { returnFormat: 'object' });
console.log(openApiObject);

// Convert Bruno collection to OpenAPI with custom variables
const openApiWithVars = convertBrunoToOpenApi(brunoCollection, { 
  variables: {
    baseUrl: 'https://api.example.com',
    apiKey: 'my-api-key'
  }
});
console.log(openApiWithVars);
```

## Features

- Convert OpenAPI v3 specifications to Bruno collections
- Convert Bruno collections to OpenAPI v3 specifications
- Support for paths, parameters, request bodies, authentication, and more
- Handles nested folders and tags
- Path-based folder structure for better organization
- Support for various authentication methods (Basic, Bearer, OAuth2, etc.)
- Support for different content types (JSON, XML, form data, etc.)

## Limitations

- Currently only supports OpenAPI v3
- Some advanced OpenAPI features may not be fully supported

## License

MIT 