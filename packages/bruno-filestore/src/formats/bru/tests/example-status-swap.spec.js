const { bruExampleToJson } = require('../index');

describe('bruExampleToJson - status/statusText swap fix', () => {
  it('should parse normal status and statusText correctly', () => {
    const parsed = {
      name: 'Normal Example',
      description: '',
      request: { url: 'https://api.example.com/test', method: 'get' },
      response: {
        headers: [],
        status: '200',
        statusText: 'OK',
        body: { type: 'json', content: '{}' }
      }
    };

    const result = bruExampleToJson(parsed, true, 'http', 'GET');
    expect(result.response.status).toBe(200);
    expect(result.response.statusText).toBe('OK');
  });

  it('should swap back status and statusText when they are reversed (pre-fix Postman import)', () => {
    const parsed = {
      name: 'Swapped Example',
      description: '',
      request: { url: 'https://api.example.com/test', method: 'get' },
      response: {
        headers: [],
        status: 'Accepted',
        statusText: '202',
        body: { type: 'json', content: '{}' }
      }
    };

    const result = bruExampleToJson(parsed, true, 'http', 'GET');
    expect(result.response.status).toBe(202);
    expect(result.response.statusText).toBe('Accepted');
  });

  it('should swap back status OK and statusText 200', () => {
    const parsed = {
      name: 'Swapped OK Example',
      description: '',
      request: { url: 'https://api.example.com/test', method: 'get' },
      response: {
        headers: [],
        status: 'OK',
        statusText: '200',
        body: { type: 'json', content: '{}' }
      }
    };

    const result = bruExampleToJson(parsed, true, 'http', 'GET');
    expect(result.response.status).toBe(200);
    expect(result.response.statusText).toBe('OK');
  });

  it('should swap back status Not Found and statusText 404', () => {
    const parsed = {
      name: 'Swapped Not Found Example',
      description: '',
      request: { url: 'https://api.example.com/test', method: 'get' },
      response: {
        headers: [],
        status: 'Not Found',
        statusText: '404',
        body: { type: 'json', content: '{}' }
      }
    };

    const result = bruExampleToJson(parsed, true, 'http', 'GET');
    expect(result.response.status).toBe(404);
    expect(result.response.statusText).toBe('Not Found');
  });

  it('should not swap when status is already numeric and statusText is text (correct order)', () => {
    const parsed = {
      name: 'Correct Order Example',
      description: '',
      request: { url: 'https://api.example.com/test', method: 'get' },
      response: {
        headers: [],
        status: '404',
        statusText: 'Not Found',
        body: { type: 'json', content: '{}' }
      }
    };

    const result = bruExampleToJson(parsed, true, 'http', 'GET');
    expect(result.response.status).toBe(404);
    expect(result.response.statusText).toBe('Not Found');
  });

  it('should use defaults when response has no status', () => {
    const parsed = {
      name: 'No Status Example',
      description: '',
      request: { url: 'https://api.example.com/test', method: 'get' },
      response: {
        headers: [],
        body: { type: 'json', content: '{}' }
      }
    };

    const result = bruExampleToJson(parsed, true, 'http', 'GET');
    expect(result.response.status).toBe(200);
    expect(result.response.statusText).toBe('OK');
  });
});
