const { describe, it, expect } = require('@jest/globals');

import { getDefaultTabPanelForHttpMethod, getDefaultTabPanelForGraphQL } from './defaultTabPanel';

describe('defaultTabPanel utilities', () => {
  describe('getDefaultTabPanelForHttpMethod', () => {
    it('should return "params" for GET method', () => {
      expect(getDefaultTabPanelForHttpMethod('GET')).toBe('params');
      expect(getDefaultTabPanelForHttpMethod('get')).toBe('params');
    });

    it('should return "params" for DELETE method', () => {
      expect(getDefaultTabPanelForHttpMethod('DELETE')).toBe('params');
      expect(getDefaultTabPanelForHttpMethod('delete')).toBe('params');
    });

    it('should return "body" for POST method', () => {
      expect(getDefaultTabPanelForHttpMethod('POST')).toBe('body');
      expect(getDefaultTabPanelForHttpMethod('post')).toBe('body');
    });

    it('should return "body" for PUT method', () => {
      expect(getDefaultTabPanelForHttpMethod('PUT')).toBe('body');
      expect(getDefaultTabPanelForHttpMethod('put')).toBe('body');
    });

    it('should return "body" for PATCH method', () => {
      expect(getDefaultTabPanelForHttpMethod('PATCH')).toBe('body');
      expect(getDefaultTabPanelForHttpMethod('patch')).toBe('body');
    });

    it('should return "params" for other HTTP methods', () => {
      expect(getDefaultTabPanelForHttpMethod('HEAD')).toBe('params');
      expect(getDefaultTabPanelForHttpMethod('OPTIONS')).toBe('params');
      expect(getDefaultTabPanelForHttpMethod('TRACE')).toBe('params');
    });

    it('should handle edge cases gracefully', () => {
      expect(getDefaultTabPanelForHttpMethod(null)).toBe('params');
      expect(getDefaultTabPanelForHttpMethod(undefined)).toBe('params');
      expect(getDefaultTabPanelForHttpMethod('')).toBe('params');
      expect(getDefaultTabPanelForHttpMethod(123)).toBe('params');
    });
  });

  describe('getDefaultTabPanelForGraphQL', () => {
    it('should always return "query" for GraphQL requests', () => {
      expect(getDefaultTabPanelForGraphQL()).toBe('query');
    });

    it('should return "query" regardless of parameters', () => {
      expect(getDefaultTabPanelForGraphQL('anything')).toBe('query');
      expect(getDefaultTabPanelForGraphQL(null)).toBe('query');
      expect(getDefaultTabPanelForGraphQL(undefined)).toBe('query');
    });
  });
});
