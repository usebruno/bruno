import {
  parseRequest,
  stringifyRequest,
  parseCollection,
  stringifyCollection,
  parseFolder,
  stringifyFolder,
  parseEnvironment,
  stringifyEnvironment,
  parseMockServer,
  stringifyMockServer
} from './index';
import { isYamlFormat } from './types';

// Parsers mint a fresh `uid` on every call, so two parses of identical bytes are never deeply
// equal. Strip uids to compare the meaningful shape.
const withoutUids = (value: any): any => {
  if (Array.isArray(value)) return value.map(withoutUids);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).filter(([key]) => key !== 'uid').map(([key, v]) => [key, withoutUids(v)])
    );
  }
  return value;
};

// `.yaml` and `.yml` are the same OpenCollection YAML under two extensions. Every entry point
// must treat them identically, otherwise a `.yaml` collection either throws
// `Unsupported format: yaml` or — worse — silently falls through to the `bru` serializer.

describe('isYamlFormat', () => {
  it('accepts both spellings', () => {
    expect(isYamlFormat('yml')).toBe(true);
    expect(isYamlFormat('yaml')).toBe(true);
  });

  it('rejects bru and unset', () => {
    expect(isYamlFormat('bru')).toBe(false);
    expect(isYamlFormat(undefined)).toBe(false);
  });
});

describe('yaml is an alias for yml at every entry point', () => {
  const requestObj: any = {
    type: 'http-request',
    name: 'Get Users',
    seq: 1,
    request: {
      method: 'GET',
      url: 'https://api.example.com/users',
      headers: [{ name: 'X-Test', value: 'v', enabled: true }],
      body: { mode: 'none' },
      auth: { mode: 'none' }
    }
  };
  const collectionRoot: any = {
    request: { headers: [{ name: 'X-Collection', value: 'v', enabled: true }] }
  };
  const brunoConfig: any = { name: 'test-collection', opencollection: '1.0.0' };
  const folderObj: any = { meta: { name: 'Users', seq: 1 } };
  const environmentObj: any = {
    name: 'Development',
    variables: [{ name: 'baseUrl', value: 'https://api.dev', enabled: true, secret: false, type: 'text' }]
  };
  const mockServerObj: any = { name: 'Mock', port: 3000, enabled: true, responses: [] };

  it('stringifyRequest produces identical bytes for yml and yaml', () => {
    expect(stringifyRequest(requestObj, { format: 'yaml' })).toBe(stringifyRequest(requestObj, { format: 'yml' }));
  });

  it('parseRequest reads yaml-written content', () => {
    const content = stringifyRequest(requestObj, { format: 'yaml' });
    expect(withoutUids(parseRequest(content, { format: 'yaml' }))).toEqual(withoutUids(parseRequest(content, { format: 'yml' })));
  });

  it('stringifyCollection / parseCollection alias yaml', () => {
    const content = stringifyCollection(collectionRoot, brunoConfig, { format: 'yaml' });
    expect(content).toBe(stringifyCollection(collectionRoot, brunoConfig, { format: 'yml' }));
    expect(withoutUids(parseCollection(content, { format: 'yaml' }))).toEqual(withoutUids(parseCollection(content, { format: 'yml' })));
  });

  it('stringifyFolder / parseFolder alias yaml', () => {
    const content = stringifyFolder(folderObj, { format: 'yaml' });
    expect(content).toBe(stringifyFolder(folderObj, { format: 'yml' }));
    expect(withoutUids(parseFolder(content, { format: 'yaml' }))).toEqual(withoutUids(parseFolder(content, { format: 'yml' })));
  });

  it('stringifyEnvironment / parseEnvironment alias yaml', () => {
    const content = stringifyEnvironment(environmentObj, { format: 'yaml' });
    expect(content).toBe(stringifyEnvironment(environmentObj, { format: 'yml' }));
    expect(withoutUids(parseEnvironment(content, { format: 'yaml' }))).toEqual(withoutUids(parseEnvironment(content, { format: 'yml' })));
  });

  it('stringifyMockServer / parseMockServer alias yaml', () => {
    const content = stringifyMockServer(mockServerObj, { format: 'yaml' });
    expect(content).toBe(stringifyMockServer(mockServerObj, { format: 'yml' }));
    expect(withoutUids(parseMockServer(content, { format: 'yaml' }))).toEqual(withoutUids(parseMockServer(content, { format: 'yml' })));
  });

  it('never routes yaml to the bru serializer', () => {
    // The bru serializer emits block syntax; the yml one emits YAML keys. If `yaml` ever fell
    // through to the `else` branch this would start looking like a .bru file.
    const content = stringifyRequest(requestObj, { format: 'yaml' });
    expect(content).toContain('info:');
    expect(content).not.toContain('meta {');
  });

  it('still rejects a genuinely unsupported format', () => {
    expect(() => parseRequest('x', { format: 'toml' as any })).toThrow('Unsupported format: toml');
    expect(() => stringifyRequest(requestObj, { format: 'toml' as any })).toThrow('Unsupported format: toml');
  });
});
