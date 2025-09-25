import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';

const openApiSpec = {
  openapi: '3.0.0',
  info: { title: 'Parameter API', version: '1.0.0' },
  servers: [{ url: 'https://api.example.com' }],
  paths: {
    '/{id}': {
      get: {
        summary: 'Get by ID',
        operationId: 'getById',
        responses: { 200: { description: 'OK' } },
      },
    },
    '/{id}/{subId}': {
      get: {
        summary: 'Get by ID and sub ID',
        operationId: 'getByIdAndSubId',
        responses: { 200: { description: 'OK' } },
      },
    },
  },
};

describe('openapi-import-grouping', () => {
  it('should handle path based grouping', () => {
    const result = openApiToBruno(openApiSpec, { grouping: 'path' });

    // Should have one folder containing both requests
    expect(result.items).toHaveLength(1);

    const folder = result.items[0];
    expect(folder.name).toBe('{id}');
    expect(folder.type).toBe('folder');

    // Folder should contain one request and one subfolder
    expect(folder.items).toHaveLength(2);

    const requests = folder.items.filter(item => item.type === 'http-request');
    const subfolders = folder.items.filter(item => item.type === 'folder');

    expect(requests).toHaveLength(1);
    expect(subfolders).toHaveLength(1);

    // Check request name
    expect(requests[0].name).toBe('Get by ID');
    expect(requests[0].request.url).toBe('{{baseUrl}}/:id');

    // Check subfolder
    expect(subfolders[0].name).toBe('{subId}');
    expect(subfolders[0].type).toBe('folder');
    expect(subfolders[0].items).toHaveLength(1);
    expect(subfolders[0].items[0].name).toBe('Get by ID and sub ID');
    expect(subfolders[0].items[0].request.url).toBe('{{baseUrl}}/:id/:subId');
  });

  it('should handle tag based grouping', () => {
    const result = openApiToBruno(openApiSpec, { grouping: 'tags' });

    // With tags grouping, requests without tags should be ungrouped
    expect(result.items).toHaveLength(2);

    // Both should be individual requests (not in folders)
    result.items.forEach(item => {
      expect(item.type).toBe('http-request');
    });

    // Check request names
    const requestNames = result.items.map(req => req.name);
    expect(requestNames).toContain('Get by ID');
    expect(requestNames).toContain('Get by ID and sub ID');

    // Check request URLs
    const urls = result.items.map(req => req.request.url);
    expect(urls).toContain('{{baseUrl}}/:id');
    expect(urls).toContain('{{baseUrl}}/:id/:subId');
  });
});
