import { supportsSetAsVariable } from './setAsVariableSupport';

describe('supportsSetAsVariable', () => {
  it('allows an http request', () => {
    expect(supportsSetAsVariable({ type: 'http-request' })).toBe(true);
  });

  it.each(['graphql-request', 'grpc-request', 'ws-request'])('blocks a %s', (type) => {
    expect(supportsSetAsVariable({ type })).toBe(false);
  });

  it('allows surfaces that belong to no protocol, such as collection settings and environments', () => {
    expect(supportsSetAsVariable(undefined)).toBe(true);
    expect(supportsSetAsVariable(null)).toBe(true);
    expect(supportsSetAsVariable({})).toBe(true);
  });

  it('allows a folder, which carries no request type', () => {
    expect(supportsSetAsVariable({ type: 'folder' })).toBe(true);
  });

  it('allows an unrecognised type rather than blocking it', () => {
    expect(supportsSetAsVariable({ type: 'not-a-request' })).toBe(true);
  });
});
