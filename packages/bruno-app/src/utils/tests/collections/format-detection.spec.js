import { isPostmanCollection } from 'utils/importers/postman-collection';
import { isInsomniaCollection } from 'utils/importers/insomnia-collection';
import { isOpenApiSpec } from 'utils/importers/openapi-collection';
import { isBrunoCollection } from 'utils/importers/bruno-collection';
import { isOpenCollection } from 'utils/importers/opencollection';

describe('Format Detection', () => {
  describe('isPostmanCollection', () => {
    it('should detect Postman v2.1 collection', () => {
      const data = {
        info: {
          name: 'Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
        },
        item: []
      };
      expect(isPostmanCollection(data)).toBe(true);
    });

    it('should detect Postman v2.0 collection', () => {
      const data = {
        info: {
          name: 'Test Collection',
          schema: 'https://schema.getpostman.com/json/collection/v2.0.0/collection.json'
        },
        item: []
      };
      expect(isPostmanCollection(data)).toBe(true);
    });

    it('should detect Postman wrapped in { collection } envelope', () => {
      const data = {
        collection: {
          info: {
            name: 'Test',
            schema: 'https://schema.getpostman.com/json/collection/v2.1.0/collection.json'
          },
          item: []
        }
      };
      expect(isPostmanCollection(data)).toBe(true);
    });

    it('should reject empty object', () => {
      expect(isPostmanCollection({})).toBe(false);
    });

    it('should reject data with empty info', () => {
      expect(isPostmanCollection({ info: {} })).toBe(false);
    });

    it('should reject data with unknown schema', () => {
      expect(isPostmanCollection({ info: { schema: 'https://unknown.com' } })).toBe(false);
    });
  });

  describe('isInsomniaCollection', () => {
    it('should detect Insomnia v5 format', () => {
      const data = {
        type: 'collection.insomnia.rest/5.0',
        collection: [{ name: 'Req 1' }]
      };
      expect(isInsomniaCollection(data)).toBe(true);
    });

    it('should detect Insomnia v4 export format', () => {
      const data = {
        _type: 'export',
        __export_format: 4,
        resources: [{ _type: 'workspace', name: 'Test' }]
      };
      expect(isInsomniaCollection(data)).toBe(true);
    });

    it('should reject empty object', () => {
      expect(isInsomniaCollection({})).toBe(false);
    });

    it('should reject non-Insomnia type', () => {
      expect(isInsomniaCollection({ type: 'http-request' })).toBe(false);
    });

    it('should reject Insomnia v5 without collection array', () => {
      const data = {
        type: 'collection.insomnia.rest/5.0',
        collection: null
      };
      expect(isInsomniaCollection(data)).toBe(false);
    });
  });

  describe('isOpenApiSpec', () => {
    it('should detect OpenAPI 3.x spec', () => {
      const data = {
        openapi: '3.0.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };
      expect(isOpenApiSpec(data)).toBe(true);
    });

    it('should detect Swagger 2.0 spec', () => {
      const data = {
        swagger: '2.0',
        info: { title: 'Test API', version: '1.0.0' },
        paths: {}
      };
      expect(isOpenApiSpec(data)).toBe(true);
    });

    it('should reject empty object', () => {
      expect(isOpenApiSpec({})).toBe(false);
    });

    it('should reject openapi alone without info', () => {
      expect(isOpenApiSpec({ openapi: '3.0.0' })).toBe(false);
    });

    it('should reject swagger alone without info', () => {
      expect(isOpenApiSpec({ swagger: '2.0' })).toBe(false);
    });
  });

  describe('isBrunoCollection', () => {
    it('should detect Bruno collection format', () => {
      const data = {
        version: '1',
        name: 'Test Collection',
        type: 'collection',
        items: []
      };
      expect(isBrunoCollection(data)).toBe(true);
    });

    it('should reject data without version', () => {
      expect(isBrunoCollection({ name: 'Test', items: [] })).toBe(false);
    });

    it('should reject data without name', () => {
      expect(isBrunoCollection({ version: '1', items: [] })).toBe(false);
    });

    it('should reject data without items array', () => {
      expect(isBrunoCollection({ version: '1', name: 'Test' })).toBe(false);
    });

    it('should reject null or non-object', () => {
      expect(isBrunoCollection(null)).toBe(false);
      expect(isBrunoCollection('string')).toBe(false);
    });
  });

  describe('isOpenCollection', () => {
    it('should detect OpenCollection format', () => {
      const data = {
        opencollection: '0.9.1',
        info: {
          name: 'Test Collection'
        }
      };
      expect(isOpenCollection(data)).toBe(true);
    });

    it('should reject data without opencollection field', () => {
      expect(isOpenCollection({ info: { name: 'Test' } })).toBe(false);
    });

    it('should reject data without info object', () => {
      expect(isOpenCollection({ opencollection: '0.9.1' })).toBe(false);
    });

    it('should reject null or empty opencollection', () => {
      expect(isOpenCollection({ opencollection: '', info: { name: 'Test' } })).toBe(false);
    });
  });
});
