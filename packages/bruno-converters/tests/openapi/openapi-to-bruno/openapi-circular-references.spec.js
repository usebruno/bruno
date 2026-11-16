import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';

describe('openapi-circular-references', () => {
  it('should handle simple circular references in schema correctly', async () => {
    const brunoCollection = openApiToBruno(circularRefsData);

    expect(brunoCollection).toMatchObject(circularRefsOutput);
  });

  it('should handle complex circular reference chains correctly', async () => {
    const brunoCollection = openApiToBruno(complexCircularRefsData);

    expect(brunoCollection).toMatchObject(circularRefsOutput);
  });

  describe('an example that refers to a recursive schema', () => {
    const folderRef = { $ref: '#/components/schemas/Folder' };
    const buildSpec = (content, componentsFirst = true) => {
      const head = { openapi: '3.0.0', info: { title: 'Demo', version: '1.0.0' } };
      const components = {
        schemas: { Folder: { type: 'object', properties: { name: { type: 'string' }, children: { type: 'array', items: folderRef } } } },
        examples: { DocsFolder: { value: { name: 'docs', children: [] } } }
      };
      const paths = {
        '/folders': { post: { summary: 'Create folder', requestBody: { content: { 'application/json': { schema: folderRef, ...content } } }, responses: { 200: { description: 'OK' } } } }
      };
      return componentsFirst ? { ...head, components, paths } : { ...head, paths, components };
    };
    const requestBody = (spec) => JSON.parse(openApiToBruno(spec).items[0].request.body.json);

    it.each([
      ['example', true],
      ['example', false],
      ['examples', true],
      ['examples', false]
    ])('builds the body from the schema when %s points at the schema (components first: %s)', (variant, componentsFirst) => {
      const content = variant === 'example' ? { example: folderRef } : { examples: { e: { value: folderRef } } };
      expect(requestBody(buildSpec(content, componentsFirst))).toEqual(requestBody(buildSpec({}, componentsFirst)));
    });

    it('stops the recursion when the example points at a recursive schema', () => {
      expect(requestBody(buildSpec({ example: folderRef }))).toEqual({ name: '', children: [{}] });
    });

    it('keeps a schema reference inside a larger example as a plain value', () => {
      expect(requestBody(buildSpec({ example: { name: 'docs', children: [folderRef] } }))).toEqual({ name: 'docs', children: [folderRef] });
    });

    it('uses the value of an example that points at another example', () => {
      const content = { examples: { e: { $ref: '#/components/examples/DocsFolder' } } };
      expect(requestBody(buildSpec(content))).toEqual({ name: 'docs', children: [] });
    });

    it('fills in another example referenced inside example data', () => {
      const content = { example: { name: 'root', children: [{ $ref: '#/components/examples/DocsFolder' }] } };
      expect(requestBody(buildSpec(content))).toEqual({ name: 'root', children: [{ name: 'docs', children: [] }] });
    });
  });

  describe('an example that refers back to itself', () => {
    const exampleRef = (name) => ({ $ref: `#/components/examples/${name}` });
    const buildSpec = (content, componentsFirst = true) => {
      const head = { openapi: '3.0.0', info: { title: 'Demo', version: '1.0.0' } };
      const components = {
        examples: {
          Tree: { value: { name: 'root', children: [exampleRef('Tree')] } },
          Root: { value: { name: 'root', child: exampleRef('Child') } },
          Child: { value: { name: 'child', parent: exampleRef('Root') } }
        }
      };
      const paths = {
        '/folders': { post: { summary: 'Create folder', requestBody: { content: { 'application/json': { schema: { type: 'object' }, ...content } } }, responses: { 200: { description: 'OK' } } } }
      };
      return componentsFirst ? { ...head, components, paths } : { ...head, paths, components };
    };
    const requestBody = (spec) => JSON.parse(openApiToBruno(spec).items[0].request.body.json);

    it.each([
      ['example', true],
      ['example', false],
      ['examples', true],
      ['examples', false]
    ])('stops at the self reference when %s points at the example (components first: %s)', (variant, componentsFirst) => {
      const content = variant === 'example' ? { example: exampleRef('Tree') } : { examples: { e: exampleRef('Tree') } };
      expect(requestBody(buildSpec(content, componentsFirst))).toEqual({ name: 'root', children: [{}] });
    });

    it.each([
      ['Root', true, { name: 'root', child: { name: 'child', parent: {} } }],
      ['Root', false, { name: 'root', child: { name: 'child', parent: {} } }],
      ['Child', true, { name: 'child', parent: {} }],
      ['Child', false, { name: 'child', parent: {} }]
    ])('stops where a ring of examples loops back, starting from %s (components first: %s)', (name, componentsFirst, expected) => {
      expect(requestBody(buildSpec({ examples: { e: exampleRef(name) } }, componentsFirst))).toEqual(expected);
    });

    it('stops at example data that contains itself', () => {
      const tree = { name: 'root' };
      tree.children = [tree];
      expect(requestBody(buildSpec({ example: tree }))).toEqual({ name: 'root', children: [{}] });
    });
  });
});

const circularRefsData = {
  components: {
    schemas: {
      schema_1: {
        additionalProperties: false,
        description: 'schema_1',
        properties: {
          conditions: {
            $ref: '#/components/schemas/schema_1'
          }
        },
        type: 'object'
      },
      schema_2: {
        additionalProperties: false,
        description: 'schema_2',
        properties: {
          conditionGroup: {
            description: 'nested schema_1',
            items: { $ref: '#/components/schemas/schema_1' },
            type: 'array'
          },
          operation: {
            description: 'operation',
            enum: ['ANY', 'ALL'],
            type: 'string'
          }
        },
        type: 'object'
      }
    }
  },
  info: {
    description: 'circular reference openapi sample json spec',
    title: 'circular reference openapi sample json spec',
    version: '0.1'
  },
  openapi: '3.0.1',
  paths: {
    '/': {
      post: {
        deprecated: false,
        description: 'echo ping api',
        operationId: 'echo ping',
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/schema_1'
              }
            }
          },
          description: 'echo ping api',
          required: true
        },
        responses: {
          200: {
            content: {
              'application/json': {
                example: 'ping'
              }
            },
            description: 'Returned if the request is successful.'
          }
        }
      }
    }
  },
  servers: [{ url: 'https://echo.usebruno.com' }]
};

// More complex circular reference test with a longer chain
const complexCircularRefsData = {
  components: {
    schemas: {
      schema_1: {
        additionalProperties: false,
        description: 'schema_1',
        properties: {
          conditionGroup: {
            description: 'nested schema_1',
            items: { $ref: '#/components/schemas/schema_2' },
            type: 'array'
          }
        },
        type: 'object'
      },
      schema_2: {
        additionalProperties: false,
        description: 'schema_2',
        properties: {
          conditionGroup: {
            description: 'nested schema_2',
            items: { $ref: '#/components/schemas/schema_3' },
            type: 'array'
          }
        },
        type: 'object'
      },
      schema_3: {
        additionalProperties: false,
        description: 'schema_3',
        properties: {
          conditionGroup: {
            description: 'nested schema_3',
            items: { $ref: '#/components/schemas/schema_4' },
            type: 'array'
          }
        },
        type: 'object'
      },
      schema_4: {
        additionalProperties: false,
        description: 'schema_4',
        properties: {
          conditionGroup: {
            description: 'nested schema_4',
            items: { $ref: '#/components/schemas/schema_5' },
            type: 'array'
          }
        },
        type: 'object'
      },
      schema_5: {
        additionalProperties: false,
        description: 'schema_4',
        properties: {
          conditionGroup: {
            description: 'nested schema_5',
            items: { $ref: '#/components/schemas/schema_1' },
            type: 'array'
          }
        },
        type: 'object'
      },
      schema_6: {
        additionalProperties: false,
        description: 'schema_3',
        properties: {
          conditionGroup: {
            description: 'nested schema_3',
            items: { $ref: '#/components/schemas/schema_1' },
            type: 'array'
          },
          operation: {
            description: 'operation',
            enum: ['ANY', 'ALL'],
            type: 'string'
          }
        },
        type: 'object'
      }
    }
  },
  info: {
    description: 'circular reference openapi sample json spec',
    title: 'circular reference openapi sample json spec',
    version: '0.1'
  },
  openapi: '3.0.1',
  paths: {
    '/': {
      post: {
        deprecated: false,
        description: 'echo ping api',
        operationId: 'echo ping',
        parameters: [],
        requestBody: {
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/schema_1'
              }
            }
          },
          description: 'echo ping api',
          required: true
        },
        responses: {
          200: {
            content: {
              'application/json': {
                example: 'ping'
              }
            },
            description: 'Returned if the request is successful.'
          }
        }
      }
    }
  },
  servers: [{ url: 'https://echo.usebruno.com' }]
};

const circularRefsOutput = {
  environments: [
    {
      name: 'Environment 1',
      variables: [
        {
          enabled: true,
          name: 'baseUrl',
          secret: false,
          type: 'text',
          value: 'https://echo.usebruno.com'
        }
      ]
    }
  ],
  items: [
    {
      name: 'echo ping',
      type: 'http-request',
      request: {
        url: '{{baseUrl}}/',
        method: 'POST',
        auth: {
          mode: 'inherit'
        },
        headers: [],
        params: [],
        body: {
          mode: 'json'
        }
      }
    }
  ],
  name: 'circular reference openapi sample json spec',
  version: '1'
};
