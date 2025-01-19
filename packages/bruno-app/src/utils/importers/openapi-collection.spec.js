import { parseOpenApiCollection } from './openapi-collection';
import { uuid } from 'utils/common';

jest.mock('utils/common');

describe('openapi importer util functions', () => {
  afterEach(jest.clearAllMocks);

  it('should convert openapi object to bruno collection correctly', async () => {
    const input = {
      openapi: '3.0.3',
      info: {
        title: 'Sample API with Multiple Servers',
        description: 'API spec with multiple servers.',
        version: '1.0.0'
      },
      servers: [
        { url: 'https://api.example.com/v1', description: 'Production Server' },
        { url: 'https://staging-api.example.com/v1', description: 'Staging Server' },
        { url: 'http://localhost:3000/v1', description: 'Local Server' }
      ],
      paths: {
        '/users': {
          get: {
            summary: 'Get a list of users',
            parameters: [
              { name: 'page', in: 'query', required: false, schema: { type: 'integer' } },
              { name: 'limit', in: 'query', required: false, schema: { type: 'integer' } }
            ],
            responses: {
              '200': { description: 'A list of users' }
            }
          }
        }
      }
    };

    const expectedOutput = {
      name: 'Sample API with Multiple Servers',
      version: '1',
      items: [
        {
          name: 'Get a list of users',
          type: 'http-request',
          request: {
            url: '{{baseUrl}}/users',
            method: 'GET',
            params: [
              { name: 'page', value: '', enabled: false, type: 'query' },
              { name: 'limit', value: '', enabled: false, type: 'query' }
            ]
          }
        }
      ],
      environments: [
        { name: 'Production Server', variables: [{ name: 'baseUrl', value: 'https://api.example.com/v1' }] },
        { name: 'Staging Server', variables: [{ name: 'baseUrl', value: 'https://staging-api.example.com/v1' }] },
        { name: 'Local Server', variables: [{ name: 'baseUrl', value: 'http://localhost:3000/v1' }] }
      ]
    };

    const result = await parseOpenApiCollection(input);

    expect(result).toMatchObject(expectedOutput);
    expect(uuid).toHaveBeenCalledTimes(10);
  });
});
