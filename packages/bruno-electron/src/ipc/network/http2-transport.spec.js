jest.mock('../../store/preferences', () => ({
  preferencesUtil: { getHttpVersion: jest.fn(() => 'http1.1') }
}));

const { preferencesUtil } = require('../../store/preferences');
const { resolveRequestedHttpVersion } = require('./http2-transport');

describe('resolveRequestedHttpVersion', () => {
  beforeEach(() => preferencesUtil.getHttpVersion.mockReturnValue('http1.1'));

  it('falls back to the global preference when no per-request setting', () => {
    expect(resolveRequestedHttpVersion({})).toBe('http1.1');
    preferencesUtil.getHttpVersion.mockReturnValue('auto');
    expect(resolveRequestedHttpVersion({})).toBe('auto');
  });

  it('uses the per-request setting when set and not "inherit"', () => {
    expect(resolveRequestedHttpVersion({ settings: { httpVersion: 'http2' } })).toBe('http2');
  });

  it('treats "inherit" as fall back to the global preference', () => {
    preferencesUtil.getHttpVersion.mockReturnValue('http2');
    expect(resolveRequestedHttpVersion({ settings: { httpVersion: 'inherit' } })).toBe('http2');
  });

  describe('collection level (precedence: request > collection > app)', () => {
    it('uses the collection setting when the request inherits', () => {
      expect(resolveRequestedHttpVersion({ settings: { httpVersion: 'inherit' } }, 'http2')).toBe('http2');
      expect(resolveRequestedHttpVersion({}, 'auto')).toBe('auto');
    });

    it('request setting wins over the collection setting', () => {
      expect(resolveRequestedHttpVersion({ settings: { httpVersion: 'http1.1' } }, 'http2')).toBe('http1.1');
    });

    it('falls through to the app preference when both request and collection inherit', () => {
      preferencesUtil.getHttpVersion.mockReturnValue('http2');
      expect(resolveRequestedHttpVersion({ settings: { httpVersion: 'inherit' } }, 'inherit')).toBe('http2');
      expect(resolveRequestedHttpVersion(null, undefined)).toBe('http2');
    });
  });
});
