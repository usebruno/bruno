import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../src/postman/postman-to-bruno';
import brunoToPostman from '../../src/postman/bruno-to-postman';
import { makeCollection, makeRequest } from '../common/postman-collection';

const importWithProtocolVersion = async (protocolVersion) => {
  const { collection, issues } = await postmanToBruno(
    makeCollection([makeRequest('Req', { protocolProfileBehavior: { protocolVersion } })])
  );
  return { settings: collection.items[0].settings, issues };
};

const makeBrunoCollection = (settings) => ({
  name: 'Test Collection',
  items: [
    {
      uid: '1',
      name: 'Req',
      type: 'http-request',
      seq: 1,
      request: {
        url: 'https://example.com',
        method: 'GET',
        headers: [],
        params: [],
        auth: { mode: 'inherit' },
        body: { mode: 'none' }
      },
      settings
    }
  ],
  root: { request: { auth: { mode: 'none' }, headers: [] } }
});

describe('postman protocolVersion <-> bruno settings.httpVersion', () => {
  describe('import (postman -> bruno)', () => {
    it.each(['http1', 'http2', 'auto'])('maps protocolVersion %p to settings.httpVersion', async (version) => {
      const { settings, issues } = await importWithProtocolVersion(version);
      expect(settings.httpVersion).toBe(version);
      expect(issues).toHaveLength(0);
    });

    it('leaves httpVersion unset when protocolVersion is absent (Bruno treats this as inherit)', async () => {
      const { collection, issues } = await postmanToBruno(makeCollection([makeRequest('Req')]));
      expect(collection.items[0].settings).not.toHaveProperty('httpVersion');
      expect(issues).toHaveLength(0);
    });

    it.each(['http3', 'HTTP/2', '2', '', true, null])(
      'drops an unsupported protocolVersion of %p and warns instead of failing the import',
      async (version) => {
        const { settings, issues } = await importWithProtocolVersion(version);
        expect(settings).not.toHaveProperty('httpVersion');
        expect(issues).toHaveLength(1);
        expect(issues[0]).toMatchObject({ path: 'Req', severity: 'warning' });
        expect(issues[0].message).toMatch(/protocolVersion/i);
      }
    );
  });

  describe('export (bruno -> postman)', () => {
    it.each(['http1', 'http2', 'auto'])('maps settings.httpVersion %p to protocolVersion', (version) => {
      const out = brunoToPostman(makeBrunoCollection({ httpVersion: version }));
      expect(out.item[0].protocolProfileBehavior.protocolVersion).toBe(version);
    });

    it.each(['inherit', undefined])('omits protocolVersion when httpVersion is %p', (version) => {
      const out = brunoToPostman(makeBrunoCollection(version === undefined ? {} : { httpVersion: version }));
      const ppb = out.item[0].protocolProfileBehavior;
      expect(ppb === undefined || ppb.protocolVersion === undefined).toBe(true);
    });
  });

  describe('round-trip (bruno -> postman -> bruno)', () => {
    it.each(['http1', 'http2', 'auto'])('preserves httpVersion %p', async (version) => {
      const postman = brunoToPostman(makeBrunoCollection({ httpVersion: version }));
      const { collection, issues } = await postmanToBruno(postman);
      expect(collection.items[0].settings.httpVersion).toBe(version);
      expect(issues).toHaveLength(0);
    });

    it('round-trips an inherit (unset) request with no httpVersion', async () => {
      const postman = brunoToPostman(makeBrunoCollection({ httpVersion: 'inherit' }));
      const { collection } = await postmanToBruno(postman);
      expect(collection.items[0].settings).not.toHaveProperty('httpVersion');
    });
  });
});
