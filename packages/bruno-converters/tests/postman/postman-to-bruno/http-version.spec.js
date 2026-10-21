import { describe, it, expect } from '@jest/globals';
import postmanToBruno from '../../../src/postman/postman-to-bruno';
import { makeCollection, makeRequest } from '../../common/postman-collection';

const importWithProtocolVersion = async (protocolProfileBehavior) => {
  const { collection, issues } = await postmanToBruno(
    makeCollection([makeRequest('Req', { protocolProfileBehavior })])
  );
  return { settings: collection.items[0].settings, issues };
};

describe('postman httpVersion import (protocolProfileBehavior.protocolVersion)', () => {
  it.each([
    ['http1', 'http1.1'],
    ['http2', 'http2'],
    ['auto', 'auto']
  ])('maps protocolVersion %p to settings.httpVersion %p', async (protocolVersion, expected) => {
    const { settings, issues } = await importWithProtocolVersion({ protocolVersion });
    expect(settings.httpVersion).toBe(expected);
    expect(issues).toHaveLength(0);
  });

  it('maps http2 to http2', async () => {
    const { settings } = await importWithProtocolVersion({ protocolVersion: 'http2' });
    expect(settings.httpVersion).toBe('http2');
  });

  it.each(['http3', 'h2c', 'HTTP2', '', null, undefined])(
    'leaves httpVersion unset for unmapped protocolVersion %p (stays inherit)',
    async (protocolVersion) => {
      const { settings } = await importWithProtocolVersion({ protocolVersion });
      expect(settings).not.toHaveProperty('httpVersion');
    }
  );

  it('leaves httpVersion unset when protocolProfileBehavior is absent', async () => {
    const { settings } = await importWithProtocolVersion(undefined);
    expect(settings).not.toHaveProperty('httpVersion');
  });
});
