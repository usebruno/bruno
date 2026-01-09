import { getParsedWsUrlObject } from './ws-url';

describe('getParsedWsUrlObject', () => {
  it('returns empty host and path for empty input', () => {
    expect(getParsedWsUrlObject('')).toEqual({ host: '', path: '' });
  });

  it('defaults to ws:// for localhost without protocol', () => {
    const parsed: any = getParsedWsUrlObject('localhost:8080/some/path');
    expect(parsed.protocol).toBe('ws:');
    expect(parsed.host).toBe('localhost:8080');
    expect(parsed.path).toBe('/some/path');
    expect(parsed.fullUrl.startsWith('ws://')).toBe(true);
  });

  it('defaults to wss:// for external hosts without protocol', () => {
    const parsed: any = getParsedWsUrlObject('example.com/s');
    expect(parsed.protocol).toBe('wss:');
    expect(parsed.host).toBe('example.com');
    expect(parsed.path).toBe('/s');
    expect(parsed.fullUrl.startsWith('wss://')).toBe(true);
  });

  it('preserves provided protocol and parses query/search', () => {
    const parsed: any = getParsedWsUrlObject('wss://example.com/path/With/cAses/?a=1&b=2');
    expect(parsed.protocol).toBe('wss:');
    expect(parsed.host).toBe('example.com');
    expect(parsed.path).toBe('/path/With/cAses');
    expect(parsed.search).toBe('?a=1&b=2');
  });

  it('removes trailing slash from path', () => {
    const parsed: any = getParsedWsUrlObject('ws://127.0.0.1:9000/endpoint/');
    expect(parsed.path).toBe('/endpoint');
  });
});
