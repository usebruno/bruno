import { describe, it, expect } from '@jest/globals';
import { swagger2ToBruno } from '../../../src/openapi/swagger2-to-bruno';

describe('swagger2-to-bruno grouping', () => {
  describe('tag-based grouping', () => {
    it('should group requests by tags by default', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Tags API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/users': {
            get: { tags: ['users'], summary: 'List users', responses: { 200: { description: 'OK' } } }
          },
          '/pets': {
            get: { tags: ['pets'], summary: 'List pets', responses: { 200: { description: 'OK' } } }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const folderNames = collection.items.filter((i) => i.type === 'folder').map((i) => i.name);
      expect(folderNames).toContain('users');
      expect(folderNames).toContain('pets');
    });

    it('should place untagged requests at root level', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Mixed Tags API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/users': {
            get: { tags: ['users'], summary: 'List users', responses: { 200: { description: 'OK' } } }
          },
          '/health': {
            get: { summary: 'Health check', responses: { 200: { description: 'OK' } } }
          }
        }
      };
      const collection = swagger2ToBruno(spec);

      // Health check should be at root level (not in a folder)
      const rootRequests = collection.items.filter((i) => i.type === 'http-request');
      expect(rootRequests.some((r) => r.name === 'Health check')).toBe(true);
    });

    it('should group multiple requests under the same tag into one folder', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Grouped API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/users': {
            get: { tags: ['users'], summary: 'List users', responses: { 200: { description: 'OK' } } },
            post: { tags: ['users'], summary: 'Create user', responses: { 201: { description: 'Created' } } }
          },
          '/users/{id}': {
            get: { tags: ['users'], summary: 'Get user', responses: { 200: { description: 'OK' } } }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const usersFolder = collection.items.find((i) => i.type === 'folder' && i.name === 'users');
      expect(usersFolder).toBeDefined();
      expect(usersFolder.items.length).toBe(3);
    });

    it('should set folder root with inherit auth and meta name', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Folder Root API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/items': {
            get: { tags: ['items'], summary: 'List items', responses: { 200: { description: 'OK' } } }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const folder = collection.items.find((i) => i.type === 'folder');
      expect(folder.root).toBeDefined();
      expect(folder.root.request.auth.mode).toBe('inherit');
      expect(folder.root.meta.name).toBe('items');
    });
  });

  describe('path-based grouping', () => {
    it('should group requests by path when specified', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Path API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/users': {
            get: { summary: 'List users', responses: { 200: { description: 'OK' } } }
          },
          '/users/{id}': {
            get: { summary: 'Get user', responses: { 200: { description: 'OK' } } }
          },
          '/pets': {
            get: { summary: 'List pets', responses: { 200: { description: 'OK' } } }
          }
        }
      };
      const collection = swagger2ToBruno(spec, { groupBy: 'path' });
      const folderNames = collection.items.map((i) => i.name);
      expect(folderNames).toContain('users');
      expect(folderNames).toContain('pets');
    });

    it('should create nested folders for deep paths', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Deep Path API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/api/v1/users': {
            get: { summary: 'List users', responses: { 200: { description: 'OK' } } }
          },
          '/api/v1/users/{id}': {
            get: { summary: 'Get user', responses: { 200: { description: 'OK' } } }
          }
        }
      };
      const collection = swagger2ToBruno(spec, { groupBy: 'path' });

      // Should have top-level 'api' folder
      const apiFolder = collection.items.find((i) => i.name === 'api');
      expect(apiFolder).toBeDefined();
      expect(apiFolder.type).toBe('folder');
    });

    it('should handle path with only one segment', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Flat Path API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/health': {
            get: { summary: 'Health', responses: { 200: { description: 'OK' } } }
          }
        }
      };
      const collection = swagger2ToBruno(spec, { groupBy: 'path' });

      const healthFolder = collection.items.find((i) => i.name === 'health');
      expect(healthFolder).toBeDefined();
      expect(healthFolder.items.length).toBe(1);
    });
  });

  describe('duplicate name handling', () => {
    it('should make duplicate operation names unique by appending method', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Dup Names API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/items': {
            get: { summary: 'Items', responses: { 200: { description: 'OK' } } },
            post: { summary: 'Items', responses: { 201: { description: 'Created' } } }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const names = collection.items.map((i) => i.name);

      // Should have unique names
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(names.length);
    });

    it('should deduplicate operation names across folders in tag-based grouping', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Cross Folder API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/users': {
            get: { tags: ['users'], summary: 'List items', responses: { 200: { description: 'OK' } } }
          },
          '/pets': {
            get: { tags: ['pets'], summary: 'List items', responses: { 200: { description: 'OK' } } }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const usersFolder = collection.items.find((i) => i.name === 'users');
      const petsFolder = collection.items.find((i) => i.name === 'pets');

      // Tag-based grouping shares a global usedNames set, so second occurrence gets a suffix
      expect(usersFolder.items[0].name).toBe('List items');
      expect(petsFolder.items[0].name).toBe('List items (GET)');
    });

    it('should not add suffixes to duplicate names in different path-based folders', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'Cross Path API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/users': {
            get: { summary: 'List items', responses: { 200: { description: 'OK' } } }
          },
          '/pets': {
            get: { summary: 'List items', responses: { 200: { description: 'OK' } } }
          }
        }
      };
      const collection = swagger2ToBruno(spec, { groupBy: 'path' });
      const usersFolder = collection.items.find((i) => i.name === 'users');
      const petsFolder = collection.items.find((i) => i.name === 'pets');

      // Path-based grouping uses per-folder usedNames, so both keep original name
      expect(usersFolder.items[0].name).toBe('List items');
      expect(petsFolder.items[0].name).toBe('List items');
    });

    it('should use method+path as name when summary and operationId are missing', () => {
      const spec = {
        swagger: '2.0',
        info: { title: 'No Name API', version: '1.0' },
        host: 'api.example.com',
        paths: {
          '/items': {
            get: { responses: { 200: { description: 'OK' } } }
          }
        }
      };
      const collection = swagger2ToBruno(spec);
      const req = collection.items[0];

      // Should fall back to method + path
      expect(req.name).toContain('get');
    });
  });
});
