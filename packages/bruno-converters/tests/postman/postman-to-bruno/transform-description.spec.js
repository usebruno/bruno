import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';

describe('transformDescription function', () => {
  it('should handle null and undefined descriptions', async () => {
    const collection = {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        description: null
      },
      item: []
    };

    const brunoCollection = await postmanToBruno(collection);
    expect(brunoCollection.root.docs).toBe('');
  });

  it('should handle string descriptions (legacy format)', async () => {
    const collection = {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        description: 'This is a string description'
      },
      item: []
    };

    const brunoCollection = await postmanToBruno(collection);
    expect(brunoCollection.root.docs).toBe('This is a string description');
  });

  it('should handle object descriptions with content property (new Postman format)', async () => {
    const collection = {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        description: {
          content: 'This is the content from the new Postman format',
          type: 'text/plain'
        }
      },
      item: []
    };

    const brunoCollection = await postmanToBruno(collection);
    expect(brunoCollection.root.docs).toBe('This is the content from the new Postman format');
  });

  it('should handle object descriptions without content property', async () => {
    const collection = {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        description: {
          type: 'text/plain'
        }
      },
      item: []
    };

    const brunoCollection = await postmanToBruno(collection);
    expect(brunoCollection.root.docs).toBe('');
  });

  it('should handle request descriptions with new format', async () => {
    const collection = {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Test Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test',
            description: {
              content: 'This is a request description in new format',
              type: 'text/plain'
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collection);
    expect(brunoCollection.items[0].request.docs).toBe('This is a request description in new format');
  });

  it('should handle folder descriptions with new format', async () => {
    const collection = {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Test Folder',
          description: {
            content: 'This is a folder description in new format',
            type: 'text/plain'
          },
          item: []
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collection);
    expect(brunoCollection.items[0].root.docs).toBe('This is a folder description in new format');
  });

  it('should handle header descriptions with new format', async () => {
    const collection = {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Test Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test',
            header: [
              {
                key: 'Authorization',
                value: 'Bearer token',
                description: {
                  content: 'Authorization header description',
                  type: 'text/plain'
                }
              }
            ]
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collection);
    expect(brunoCollection.items[0].request.headers[0].description).toBe('Authorization header description');
  });

  it('should handle query parameter descriptions with new format', async () => {
    const collection = {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Test Request',
          request: {
            method: 'GET',
            url: {
              raw: 'https://api.example.com/test?param=value',
              host: ['api', 'example', 'com'],
              path: ['test'],
              query: [
                {
                  key: 'param',
                  value: 'value',
                  description: {
                    content: 'Query parameter description',
                    type: 'text/plain'
                  }
                }
              ]
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collection);
    expect(brunoCollection.items[0].request.params[0].description).toBe('Query parameter description');
  });

  it('should handle path variable descriptions with new format', async () => {
    const collection = {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Test Request',
          request: {
            method: 'GET',
            url: {
              raw: 'https://api.example.com/users/:id',
              host: ['api', 'example', 'com'],
              path: ['users', ':id'],
              variable: [
                {
                  key: 'id',
                  value: '123',
                  description: {
                    content: 'User ID path variable',
                    type: 'text/plain'
                  }
                }
              ]
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collection);
    expect(brunoCollection.items[0].request.params[0].description).toBe('User ID path variable');
  });

  it('should handle form data descriptions with new format', async () => {
    const collection = {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Test Request',
          request: {
            method: 'POST',
            url: 'https://api.example.com/test',
            body: {
              mode: 'formdata',
              formdata: [
                {
                  key: 'field1',
                  value: 'value1',
                  description: {
                    content: 'Form field description',
                    type: 'text/plain'
                  }
                }
              ]
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collection);
    expect(brunoCollection.items[0].request.body.multipartForm[0].description).toBe('Form field description');
  });

  it('should handle urlencoded form descriptions with new format', async () => {
    const collection = {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
      },
      item: [
        {
          name: 'Test Request',
          request: {
            method: 'POST',
            url: 'https://api.example.com/test',
            body: {
              mode: 'urlencoded',
              urlencoded: [
                {
                  key: 'field1',
                  value: 'value1',
                  description: {
                    content: 'URL encoded field description',
                    type: 'text/plain'
                  }
                }
              ]
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collection);
    expect(brunoCollection.items[0].request.body.formUrlEncoded[0].description).toBe('URL encoded field description');
  });

  it('should handle mixed description formats in the same collection', async () => {
    const collection = {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        description: 'Collection with string description'
      },
      item: [
        {
          name: 'Test Folder',
          description: {
            content: 'Folder with object description',
            type: 'text/plain'
          },
          item: [
            {
              name: 'Test Request',
              request: {
                method: 'GET',
                url: 'https://api.example.com/test',
                description: 'Request with string description',
                header: [
                  {
                    key: 'Content-Type',
                    value: 'application/json',
                    description: {
                      content: 'Header with object description',
                      type: 'text/plain'
                    }
                  }
                ]
              }
            }
          ]
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collection);

    // Collection description (string)
    expect(brunoCollection.root.docs).toBe('Collection with string description');

    // Folder description (object)
    expect(brunoCollection.items[0].root.docs).toBe('Folder with object description');

    // Request description (string)
    expect(brunoCollection.items[0].items[0].request.docs).toBe('Request with string description');

    // Header description (object)
    expect(brunoCollection.items[0].items[0].request.headers[0].description).toBe('Header with object description');
  });

  it('should handle edge cases like empty strings and special characters', async () => {
    const collection = {
      info: {
        name: 'Test Collection',
        schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json',
        description: {
          content: '',
          type: 'text/plain'
        }
      },
      item: [
        {
          name: 'Test Request',
          request: {
            method: 'GET',
            url: 'https://api.example.com/test',
            description: {
              content: 'Description with special chars: !@#$%^&*()',
              type: 'text/plain'
            }
          }
        }
      ]
    };

    const brunoCollection = await postmanToBruno(collection);
    expect(brunoCollection.root.docs).toBe('');
    expect(brunoCollection.items[0].request.docs).toBe('Description with special chars: !@#$%^&*()');
  });
});
