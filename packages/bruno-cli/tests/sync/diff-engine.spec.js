const { computeDrift } = require('../../src/sync/diff-engine');

// Minimal OpenAPI spec helper
const makeSpec = (paths) => ({
  openapi: '3.0.0',
  info: { title: 'Test', version: '1.0' },
  paths
});

// Minimal Bruno collection helper
const makeCollection = (items) => ({
  brunoConfig: { version: '1', name: 'test', type: 'collection' },
  format: 'bru',
  pathname: '/tmp/test',
  items
});

const makeRequest = (name, method, url, extras = {}) => ({
  name,
  type: 'http-request',
  request: {
    method,
    url,
    params: [],
    headers: [],
    body: { mode: 'none' },
    auth: { mode: 'inherit' },
    ...extras
  }
});

describe('computeDrift', () => {
  it('detects missing endpoints', () => {
    const spec = makeSpec({
      '/users': { get: { summary: 'List users', responses: { 200: { description: 'OK' } } } }
    });
    const collection = makeCollection([]);

    const report = computeDrift(spec, collection);

    expect(report.summary.missing).toBe(1);
    expect(report.summary.stale).toBe(0);
    expect(report.summary.inSync).toBe(0);
    expect(report.missing[0].method).toBe('GET');
    expect(report.missing[0].path).toBe('/users');
  });

  it('detects stale endpoints', () => {
    const spec = makeSpec({});
    const collection = makeCollection([
      makeRequest('Get Users', 'GET', '/users')
    ]);

    const report = computeDrift(spec, collection);

    expect(report.summary.stale).toBe(1);
    expect(report.summary.missing).toBe(0);
    expect(report.stale[0].method).toBe('GET');
  });

  it('detects in-sync endpoints', () => {
    const spec = makeSpec({
      '/users': { get: { summary: 'List users', responses: { 200: { description: 'OK' } } } }
    });
    const collection = makeCollection([
      makeRequest('Get Users', 'GET', '/users')
    ]);

    const report = computeDrift(spec, collection);

    expect(report.summary.inSync).toBe(1);
    expect(report.summary.missing).toBe(0);
    expect(report.summary.stale).toBe(0);
  });

  it('detects modified endpoints (body change)', () => {
    const spec = makeSpec({
      '/users': {
        post: {
          summary: 'Create user',
          requestBody: {
            content: {
              'application/json': {
                schema: { type: 'object', properties: { name: { type: 'string' } } }
              }
            }
          },
          responses: { 201: { description: 'Created' } }
        }
      }
    });
    const collection = makeCollection([
      makeRequest('Create User', 'POST', '/users', { body: { mode: 'text' } })
    ]);

    const report = computeDrift(spec, collection);

    expect(report.summary.modified).toBe(1);
    expect(report.modified[0].changes).toContain('body');
  });

  it('handles mixed drift scenarios', () => {
    const spec = makeSpec({
      '/users': { get: { summary: 'List', responses: { 200: { description: 'OK' } } } },
      '/orders': { get: { summary: 'Orders', responses: { 200: { description: 'OK' } } } }
    });
    const collection = makeCollection([
      makeRequest('List Users', 'GET', '/users'),
      makeRequest('Old Endpoint', 'DELETE', '/legacy')
    ]);

    const report = computeDrift(spec, collection);

    expect(report.summary.inSync).toBe(1);
    expect(report.summary.missing).toBe(1);
    expect(report.summary.stale).toBe(1);
    expect(report.summary.total).toBe(3);
  });

  it('handles url normalization with template variables', () => {
    const spec = makeSpec({
      '/api/users': { get: { summary: 'Users', responses: { 200: { description: 'OK' } } } }
    });
    const collection = makeCollection([
      makeRequest('Users', 'GET', '{{baseUrl}}/api/users')
    ]);

    const report = computeDrift(spec, collection);

    expect(report.summary.inSync).toBe(1);
    expect(report.summary.missing).toBe(0);
  });

  it('handles empty spec and empty collection', () => {
    const spec = makeSpec({});
    const collection = makeCollection([]);

    const report = computeDrift(spec, collection);

    expect(report.summary.total).toBe(0);
    expect(report.summary.inSync).toBe(0);
  });
});
