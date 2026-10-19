jest.mock('../../store/preferences', () => ({
  preferencesUtil: { getHttpVersion: jest.fn(() => 'http1.1') }
}));

const { preferencesUtil } = require('../../store/preferences');
const { resolveRequestedHttpVersion, canUseHttp2, applyHttp2Transport } = require('./http2-transport');

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

  describe('applyHttp2Transport (stub)', () => {
    it('attaches no transport for any mode', async () => {
      for (const mode of ['http1.1', 'auto', 'http2']) {
        const config = {};
        await applyHttp2Transport({ config, mode, agentOptions: {}, timeline: [] });
        expect(config.transport).toBeUndefined();
      }
    });

    it('records a timeline note when h2 is requested but not yet implemented', async () => {
      const timeline = [];
      await applyHttp2Transport({ config: {}, mode: 'http2', agentOptions: {}, timeline });
      expect(timeline.some((e) => /not yet implemented/.test(e.message))).toBe(true);
    });

    it('adds no timeline note for http1.1 (h2 path skipped)', async () => {
      const timeline = [];
      await applyHttp2Transport({ config: {}, mode: 'http1.1', agentOptions: {}, timeline });
      expect(timeline).toHaveLength(0);
    });
  });
});
