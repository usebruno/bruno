const { describe, it, expect } = require('@jest/globals');

import {
  getBodyContent,
  getBodyMode,
  getMethod,
  getUrl,
  computeItemDiffStatus
} from './bruUtils';

describe('bruUtils', () => {
  describe('getBodyContent', () => {
    it('should return empty string for null or undefined body', () => {
      expect(getBodyContent(null)).toBe('');
      expect(getBodyContent(undefined)).toBe('');
    });

    it('should return empty string for empty body', () => {
      expect(getBodyContent({})).toBe('');
    });

    it('should return json content', () => {
      expect(getBodyContent({ json: '{"key": "value"}' })).toBe('{"key": "value"}');
    });

    it('should return text content', () => {
      expect(getBodyContent({ text: 'plain text content' })).toBe('plain text content');
    });

    it('should return xml content', () => {
      expect(getBodyContent({ xml: '<root><item>value</item></root>' })).toBe('<root><item>value</item></root>');
    });

    it('should return sparql content', () => {
      expect(getBodyContent({ sparql: 'SELECT * WHERE { ?s ?p ?o }' })).toBe('SELECT * WHERE { ?s ?p ?o }');
    });

    it('should return graphql query content', () => {
      expect(getBodyContent({ graphql: { query: 'query { users { id } }' } })).toBe('query { users { id } }');
    });

    it('should return generic content', () => {
      expect(getBodyContent({ content: 'generic content' })).toBe('generic content');
    });

    it('should return empty string for graphql without query', () => {
      expect(getBodyContent({ graphql: {} })).toBe('');
      expect(getBodyContent({ graphql: { variables: '{}' } })).toBe('');
    });

    it('should prioritize json over other types', () => {
      expect(getBodyContent({ json: '{"a":1}', text: 'text' })).toBe('{"a":1}');
    });
  });

  describe('getBodyMode', () => {
    it('should return none for null or undefined body', () => {
      expect(getBodyMode(null)).toBe('none');
      expect(getBodyMode(undefined)).toBe('none');
    });

    it('should return none for empty body', () => {
      expect(getBodyMode({})).toBe('none');
    });

    it('should return json mode', () => {
      expect(getBodyMode({ json: '{}' })).toBe('json');
      expect(getBodyMode({ json: '' })).toBe('json');
    });

    it('should return text mode', () => {
      expect(getBodyMode({ text: 'content' })).toBe('text');
      expect(getBodyMode({ text: '' })).toBe('text');
    });

    it('should return xml mode', () => {
      expect(getBodyMode({ xml: '<root/>' })).toBe('xml');
    });

    it('should return sparql mode', () => {
      expect(getBodyMode({ sparql: 'SELECT *' })).toBe('sparql');
    });

    it('should return graphql mode', () => {
      expect(getBodyMode({ graphql: { query: '' } })).toBe('graphql');
    });

    it('should return formUrlEncoded mode', () => {
      expect(getBodyMode({ formUrlEncoded: [] })).toBe('formUrlEncoded');
      expect(getBodyMode({ formUrlEncoded: [{ name: 'key', value: 'val' }] })).toBe('formUrlEncoded');
    });

    it('should return multipartForm mode', () => {
      expect(getBodyMode({ multipartForm: [] })).toBe('multipartForm');
    });

    it('should return file mode', () => {
      expect(getBodyMode({ file: [] })).toBe('file');
    });

    it('should return grpc mode', () => {
      expect(getBodyMode({ grpc: [] })).toBe('grpc');
    });

    it('should return ws mode', () => {
      expect(getBodyMode({ ws: [] })).toBe('ws');
    });

    it('should return none for explicit none mode', () => {
      expect(getBodyMode({ mode: 'none' })).toBe('none');
    });

    it('should prioritize json over other modes', () => {
      expect(getBodyMode({ json: '{}', text: 'text' })).toBe('json');
    });
  });

  describe('getMethod', () => {
    it('should return GET as default', () => {
      expect(getMethod(null)).toBe('GET');
      expect(getMethod(undefined)).toBe('GET');
      expect(getMethod({})).toBe('GET');
    });

    it('should return request method', () => {
      expect(getMethod({ request: { method: 'POST' } })).toBe('POST');
      expect(getMethod({ request: { method: 'PUT' } })).toBe('PUT');
      expect(getMethod({ request: { method: 'DELETE' } })).toBe('DELETE');
    });

    it('should return GET when request exists but method is missing', () => {
      expect(getMethod({ request: {} })).toBe('GET');
    });
  });

  describe('getUrl', () => {
    it('should return empty string as default', () => {
      expect(getUrl(null)).toBe('');
      expect(getUrl(undefined)).toBe('');
      expect(getUrl({})).toBe('');
    });

    it('should return request url', () => {
      expect(getUrl({ request: { url: 'https://api.example.com/users' } })).toBe('https://api.example.com/users');
    });

    it('should return empty string when request exists but url is missing', () => {
      expect(getUrl({ request: {} })).toBe('');
    });

    it('should return url with different protocols', () => {
      expect(getUrl({ request: { url: 'http://localhost:3000' } })).toBe('http://localhost:3000');
      expect(getUrl({ request: { url: 'ws://localhost:8080' } })).toBe('ws://localhost:8080');
      expect(getUrl({ request: { url: 'grpc://localhost:50051' } })).toBe('grpc://localhost:50051');
    });
  });

  describe('computeItemDiffStatus', () => {
    it('should return deleted when other item is missing and showing old side', () => {
      expect(computeItemDiffStatus({ name: 'key', value: 'val' }, null, 'old')).toBe('deleted');
      expect(computeItemDiffStatus({ name: 'key', value: 'val' }, undefined, 'old')).toBe('deleted');
    });

    it('should return added when other item is missing and showing new side', () => {
      expect(computeItemDiffStatus({ name: 'key', value: 'val' }, null, 'new')).toBe('added');
      expect(computeItemDiffStatus({ name: 'key', value: 'val' }, undefined, 'new')).toBe('added');
    });

    it('should return unchanged when items are equal', () => {
      const item = { name: 'key', value: 'val', enabled: true };
      const otherItem = { name: 'key', value: 'val', enabled: true };
      expect(computeItemDiffStatus(item, otherItem, 'old')).toBe('unchanged');
      expect(computeItemDiffStatus(item, otherItem, 'new')).toBe('unchanged');
    });

    it('should return modified when values differ', () => {
      const item = { name: 'key', value: 'val1', enabled: true };
      const otherItem = { name: 'key', value: 'val2', enabled: true };
      expect(computeItemDiffStatus(item, otherItem, 'old')).toBe('modified');
    });

    it('should return modified when enabled status differs', () => {
      const item = { name: 'key', value: 'val', enabled: true };
      const otherItem = { name: 'key', value: 'val', enabled: false };
      expect(computeItemDiffStatus(item, otherItem, 'old')).toBe('modified');
    });

    it('should handle undefined enabled as different from explicit false', () => {
      const item = { name: 'key', value: 'val' };
      const otherItem = { name: 'key', value: 'val', enabled: false };
      expect(computeItemDiffStatus(item, otherItem, 'old')).toBe('modified');
    });
  });
});
