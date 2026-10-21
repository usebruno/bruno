import { describe, it, expect } from '@jest/globals';
import insomniaToBruno from '../../src/insomnia/insomnia-to-bruno';

// v4 export: preferredHttpVersion is a flat field on the request.
const makeV4 = (preferredHttpVersion) => ({
  _type: 'export',
  __export_format: 4,
  resources: [
    {
      _id: 'req_1',
      _type: 'request',
      parentId: 'wrk_1',
      name: 'Req',
      method: 'GET',
      url: 'https://example.com',
      parameters: [],
      ...(preferredHttpVersion !== undefined ? { preferredHttpVersion } : {})
    },
    { _id: 'wrk_1', _type: 'workspace', name: 'WS' }
  ]
});

// v5 export: preferredHttpVersion lives under request.settings.
const makeV5 = (preferredHttpVersion) => ({
  _type: 'export',
  __export_format: 4,
  resources: [
    {
      _id: 'req_1',
      _type: 'request',
      parentId: 'wrk_1',
      name: 'Req',
      method: 'GET',
      url: 'https://example.com',
      parameters: [],
      settings: preferredHttpVersion !== undefined ? { preferredHttpVersion } : {}
    },
    { _id: 'wrk_1', _type: 'workspace', name: 'WS' }
  ]
});

const settingsOf = (insomniaExport) => insomniaToBruno(insomniaExport).items[0].settings;

describe('insomnia httpVersion import (preferredHttpVersion)', () => {
  describe.each([
    ['v4 (flat)', makeV4],
    ['v5 (settings)', makeV5]
  ])('%s', (_label, make) => {
    it.each([
      ['V1_0', 'http1.1'],
      ['V1_1', 'http1.1'],
      ['V2_0', 'http2'],
      ['V2PriorKnowledge', 'http2']
    ])('maps %p to settings.httpVersion %p', (preferred, expected) => {
      expect(settingsOf(make(preferred)).httpVersion).toBe(expected);
    });

    it.each(['default', 'v3', 'HTTP2', '', undefined])(
      'leaves httpVersion unset for unmapped value %p (stays inherit)',
      (preferred) => {
        expect(settingsOf(make(preferred))).not.toHaveProperty('httpVersion');
      }
    );
  });

  it('maps both V2_0 and V2PriorKnowledge to http2 (prior knowledge is applied by scheme)', () => {
    expect(settingsOf(makeV4('V2_0')).httpVersion).toBe('http2');
    expect(settingsOf(makeV4('V2PriorKnowledge')).httpVersion).toBe('http2');
  });
});
