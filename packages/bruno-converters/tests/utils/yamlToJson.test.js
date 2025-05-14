import yamlToJson from '../../src/utils/yamlToJson';

describe('yamlToJson', () => {
  test('should convert simple YAML to JSON object', () => {
    const yaml = `
name: Test
version: 1.0
enabled: true
`;
    
    const result = yamlToJson(yaml);
    
    expect(result).toEqual({
      name: 'Test',
      version: 1.0,
      enabled: true
    });
  });

  test('should convert complex YAML to JSON object', () => {
    const yaml = `
collection:
  name: API Tests
  version: 2.1
  items:
    - name: Get Users
      method: GET
      url: https://api.example.com/users
    - name: Create User
      method: POST
      url: https://api.example.com/users
      body:
        mode: raw
        raw: '{"name": "John", "email": "john@example.com"}'
`;
    
    const result = yamlToJson(yaml);
    
    expect(result).toEqual({
      collection: {
        name: 'API Tests',
        version: 2.1,
        items: [
          {
            name: 'Get Users',
            method: 'GET',
            url: 'https://api.example.com/users'
          },
          {
            name: 'Create User',
            method: 'POST',
            url: 'https://api.example.com/users',
            body: {
              mode: 'raw',
              raw: '{"name": "John", "email": "john@example.com"}'
            }
          }
        ]
      }
    });
  });
}); 