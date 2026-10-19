jest.mock('../../store/preferences', () => ({
  preferencesUtil: { getHttpVersion: jest.fn(() => 'http1.1') }
}));
jest.mock('@usebruno/requests', () => ({ resolveHttpVersion: jest.fn() }));

const { preferencesUtil } = require('../../store/preferences');
const { resolveRequestedHttpVersion, canUseHttp2, applyHttp2Transport } = require('./http2-transport');
const { resolveHttpVersion } = require('@usebruno/requests');

describe('http2 seam (Phase 1)', () => {
  beforeEach(() => preferencesUtil.getHttpVersion.mockReturnValue('http1.1'));

  describe('resolveRequestedHttpVersion', () => {
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
  });

  describe('canUseHttp2', () => {
    it('is true for auto and http2, false for http1.1', () => {
      expect(canUseHttp2('auto')).toBe(true);
      expect(canUseHttp2('http2')).toBe(true);
      expect(canUseHttp2('http1.1')).toBe(false);
    });
  });

  describe('applyHttp2Transport (Phase 2 — resolve + log, no transport yet)', () => {
    beforeEach(() => resolveHttpVersion.mockReset());

    it('skips the h2 path for http1.1 (no resolve, no timeline, no transport)', async () => {
      const config = { url: 'https://x.test/' };
      const timeline = [];
      await applyHttp2Transport({ config, requestedHttpVersion: 'http1.1', agentOptions: {}, timeline });
      expect(resolveHttpVersion).not.toHaveBeenCalled();
      expect(timeline).toHaveLength(0);
      expect(config.transport).toBeUndefined();
    });

    it('logs ALPN + an h2-negotiated note but attaches no transport', async () => {
      resolveHttpVersion.mockResolvedValue({
        httpVersion: 2,
        reason: 'auto (h2)',
        offered: ['h2', 'http/1.1'],
        alpn: 'h2'
      });
      const config = { url: 'https://x.test/' };
      const timeline = [];
      await applyHttp2Transport({ config, requestedHttpVersion: 'auto', agentOptions: {}, timeline });
      expect(config.transport).toBeUndefined();
      expect(timeline.some((e) => /ALPN: offered/.test(e.message))).toBe(true);
      expect(timeline.some((e) => /HTTP\/2 negotiated/.test(e.message))).toBe(true);
    });

    it('logs HTTP/1.1 selected when negotiation falls back', async () => {
      resolveHttpVersion.mockResolvedValue({ httpVersion: 1, reason: 'auto (http/1.1)', offered: ['h2', 'http/1.1'], alpn: 'http/1.1' });
      const config = { url: 'https://x.test/' };
      const timeline = [];
      await applyHttp2Transport({ config, requestedHttpVersion: 'auto', agentOptions: {}, timeline });
      expect(config.transport).toBeUndefined();
      expect(timeline.some((e) => /HTTP\/1.1 selected/.test(e.message))).toBe(true);
    });
  });
});
