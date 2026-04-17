import { describe, it, expect } from '@jest/globals';
import { swagger2ToBruno } from '../../../src/openapi/swagger2-to-bruno';

describe('swagger2-to-bruno body handling', () => {
  it('should convert body parameter to JSON body', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'JSON Body API', version: '1.0' },
      host: 'api.example.com',
      consumes: ['application/json'],
      paths: {
        '/items': {
          post: {
            summary: 'Create item',
            parameters: [
              {
                in: 'body',
                name: 'body',
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string', example: 'Widget' },
                    count: { type: 'integer' },
                    active: { type: 'boolean' }
                  }
                }
              }
            ],
            responses: { 201: { description: 'Created' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Create item');

    expect(req.request.body.mode).toBe('json');
    const body = JSON.parse(req.request.body.json);
    expect(body.name).toBe('Widget');
    expect(body.count).toBe(0);
    expect(body.active).toBe(false);
  });

  it('should handle array body schema', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Array Body API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/users': {
          post: {
            summary: 'Create users',
            parameters: [
              {
                in: 'body',
                name: 'body',
                schema: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      username: { type: 'string' },
                      email: { type: 'string' }
                    }
                  }
                }
              }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Create users');

    expect(req.request.body.mode).toBe('json');
    const body = JSON.parse(req.request.body.json);
    expect(Array.isArray(body)).toBe(true);
    expect(body[0]).toHaveProperty('username');
    expect(body[0]).toHaveProperty('email');
  });

  it('should handle body with explicit example', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Example Body API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/data': {
          post: {
            summary: 'Post data',
            parameters: [
              {
                in: 'body',
                name: 'body',
                schema: {
                  type: 'object',
                  example: { key: 'value', nested: { a: 1 } }
                }
              }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Post data');
    const body = JSON.parse(req.request.body.json);
    expect(body.key).toBe('value');
    expect(body.nested.a).toBe(1);
  });

  it('should handle formUrlEncoded body from formData params', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Form API', version: '1.0' },
      host: 'api.example.com',
      consumes: ['application/x-www-form-urlencoded'],
      paths: {
        '/login': {
          post: {
            summary: 'Login',
            parameters: [
              { in: 'formData', name: 'username', type: 'string', required: true },
              { in: 'formData', name: 'password', type: 'string', required: true }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Login');

    expect(req.request.body.mode).toBe('formUrlEncoded');
    expect(req.request.body.formUrlEncoded.length).toBe(2);
    expect(req.request.body.formUrlEncoded[0].name).toBe('username');
    expect(req.request.body.formUrlEncoded[1].name).toBe('password');
  });

  it('should handle multipart/form-data with file upload', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Upload API', version: '1.0' },
      host: 'api.example.com',
      consumes: ['multipart/form-data'],
      paths: {
        '/upload': {
          post: {
            summary: 'Upload file',
            parameters: [
              { in: 'formData', name: 'description', type: 'string' },
              { in: 'formData', name: 'file', type: 'file' }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Upload file');

    expect(req.request.body.mode).toBe('multipartForm');

    const fileField = req.request.body.multipartForm.find((f) => f.name === 'file');
    expect(fileField).toBeDefined();
    expect(fileField.type).toBe('file');

    const textField = req.request.body.multipartForm.find((f) => f.name === 'description');
    expect(textField).toBeDefined();
    expect(textField.type).toBe('text');
  });

  it('should handle XML body via consumes', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'XML API', version: '1.0' },
      host: 'api.example.com',
      consumes: ['application/xml'],
      paths: {
        '/data': {
          post: {
            summary: 'Submit XML',
            parameters: [
              {
                in: 'body',
                name: 'body',
                schema: {
                  type: 'object',
                  properties: {
                    name: { type: 'string' },
                    value: { type: 'integer' }
                  }
                }
              }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Submit XML');

    expect(req.request.body.mode).toBe('xml');
    expect(req.request.body.xml).toContain('<?xml');
    expect(req.request.body.xml).toContain('<name>');
    expect(req.request.body.xml).toContain('<value>');
  });

  it('should handle text/xml content type', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Text XML API', version: '1.0' },
      host: 'api.example.com',
      consumes: ['text/xml'],
      paths: {
        '/data': {
          post: {
            summary: 'Submit Text XML',
            parameters: [
              {
                in: 'body',
                name: 'body',
                schema: { type: 'object', properties: { key: { type: 'string' } } }
              }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Submit Text XML');
    expect(req.request.body.mode).toBe('xml');
  });

  it('should handle JSON variant content types like application/ld+json', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'JSON-LD API', version: '1.0' },
      host: 'api.example.com',
      consumes: ['application/ld+json'],
      paths: {
        '/data': {
          post: {
            summary: 'Post JSON-LD',
            parameters: [
              {
                in: 'body',
                name: 'body',
                schema: { type: 'object', properties: { id: { type: 'string' } } }
              }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Post JSON-LD');
    expect(req.request.body.mode).toBe('json');
  });

  it('should handle */* content type as text', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Wildcard API', version: '1.0' },
      host: 'api.example.com',
      consumes: ['*/*'],
      paths: {
        '/data': {
          post: {
            summary: 'Post wildcard',
            parameters: [
              { in: 'body', name: 'body', schema: { type: 'string' } }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Post wildcard');
    expect(req.request.body.mode).toBe('text');
  });

  it('should handle application/octet-stream as text', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Binary API', version: '1.0' },
      host: 'api.example.com',
      consumes: ['application/octet-stream'],
      paths: {
        '/upload': {
          post: {
            summary: 'Upload binary',
            parameters: [
              { in: 'body', name: 'body', schema: { type: 'string' } }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Upload binary');
    expect(req.request.body.mode).toBe('text');
  });

  it('should use operation-level consumes over global consumes', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Override API', version: '1.0' },
      host: 'api.example.com',
      consumes: ['application/json'],
      paths: {
        '/data': {
          post: {
            summary: 'Submit data',
            consumes: ['application/xml'],
            parameters: [
              {
                in: 'body',
                name: 'body',
                schema: { type: 'object', properties: { name: { type: 'string' } } }
              }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Submit data');
    expect(req.request.body.mode).toBe('xml');
  });

  it('should handle XML body with string example (raw XML)', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Raw XML API', version: '1.0' },
      host: 'api.example.com',
      consumes: ['application/xml'],
      paths: {
        '/data': {
          post: {
            summary: 'Post raw XML',
            parameters: [
              {
                in: 'body',
                name: 'body',
                schema: {
                  type: 'object',
                  example: '<root><item>hello</item></root>'
                }
              }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Post raw XML');
    expect(req.request.body.mode).toBe('xml');
    expect(req.request.body.xml).toBe('<root><item>hello</item></root>');
  });

  it('should not crash when body param has no schema', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'No Schema API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/test': {
          post: {
            summary: 'Post test',
            parameters: [
              { in: 'body', name: 'body' }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Post test');
    expect(req).toBeDefined();
    expect(req.request.body.mode).toBe('none');
  });

  it('should handle formData with default and example values', () => {
    const spec = {
      swagger: '2.0',
      info: { title: 'Form Values API', version: '1.0' },
      host: 'api.example.com',
      paths: {
        '/submit': {
          post: {
            summary: 'Submit form',
            consumes: ['application/x-www-form-urlencoded'],
            parameters: [
              { in: 'formData', name: 'name', type: 'string', example: 'John' },
              { in: 'formData', name: 'age', type: 'integer', default: 25 },
              { in: 'formData', name: 'role', type: 'string', enum: ['admin', 'user'] }
            ],
            responses: { 200: { description: 'OK' } }
          }
        }
      }
    };
    const collection = swagger2ToBruno(spec);
    const req = collection.items.find((i) => i.name === 'Submit form');

    expect(req.request.body.mode).toBe('formUrlEncoded');
    const nameField = req.request.body.formUrlEncoded.find((f) => f.name === 'name');
    const ageField = req.request.body.formUrlEncoded.find((f) => f.name === 'age');
    const roleField = req.request.body.formUrlEncoded.find((f) => f.name === 'role');

    expect(nameField.value).toBe('John');
    expect(ageField.value).toBe('25');
    expect(roleField.value).toBe('admin');
  });
});
