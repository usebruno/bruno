const path = require('node:path');
const fs = require('node:fs');
const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const { handler, cleanItems } = require('../../src/commands/export');

describe('export command', () => {
  describe('cleanItems', () => {
    it('should remove items array from http-request objects', () => {
      const items = [
        {
          type: 'http-request',
          name: 'Test Request',
          items: [],
          request: { method: 'GET' }
        }
      ];

      const cleaned = cleanItems(items);

      expect(cleaned[0]).not.toHaveProperty('items');
      expect(cleaned[0]).toHaveProperty('name', 'Test Request');
      expect(cleaned[0]).toHaveProperty('type', 'http-request');
    });

    it('should remove items array from graphql-request objects', () => {
      const items = [
        {
          type: 'graphql-request',
          name: 'Test GraphQL',
          items: [],
          request: { method: 'POST' }
        }
      ];

      const cleaned = cleanItems(items);

      expect(cleaned[0]).not.toHaveProperty('items');
      expect(cleaned[0]).toHaveProperty('type', 'graphql-request');
    });

    it('should recursively clean items in folders', () => {
      const items = [
        {
          type: 'folder',
          name: 'Test Folder',
          items: [
            {
              type: 'http-request',
              name: 'Nested Request',
              items: [],
              request: { method: 'POST' }
            }
          ]
        }
      ];

      const cleaned = cleanItems(items);

      expect(cleaned[0]).toHaveProperty('items');
      expect(cleaned[0].items[0]).not.toHaveProperty('items');
      expect(cleaned[0].items[0]).toHaveProperty('name', 'Nested Request');
    });

    it('should preserve folder items array', () => {
      const items = [
        {
          type: 'folder',
          name: 'Test Folder',
          items: []
        }
      ];

      const cleaned = cleanItems(items);

      expect(cleaned[0]).toHaveProperty('items');
      expect(cleaned[0].items).toEqual([]);
    });
  });
});
