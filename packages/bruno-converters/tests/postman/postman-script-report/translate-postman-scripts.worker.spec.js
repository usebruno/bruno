/**
 * Whatever the worker does not put on the message is lost to the report. Only
 * that wiring is asserted here, since the real worker path cannot be driven
 * from this test environment; what a measurement may *contain* is a property of
 * the real translator, covered in `postman-script-report.spec.js`.
 */

const mockTranslatePostmanScript = jest.fn();
const mockHandlers = {};

jest.mock('node:worker_threads', () => ({
  parentPort: {
    on: (event, handler) => { mockHandlers[event] = handler; },
    postMessage: jest.fn()
  }
}), { virtual: true });

jest.mock('@usebruno/converters', () => ({ translatePostmanScript: mockTranslatePostmanScript }), { virtual: true });

const { parentPort } = require('node:worker_threads');
require('../../../src/workers/scripts/translate-postman-scripts');

const runWorker = (scripts) => {
  parentPort.postMessage.mockClear();
  mockHandlers.message({ scripts });
  return parentPort.postMessage.mock.calls[0][0];
};

const scriptEntry = (uid, exec, listen = 'test') => [uid, { events: [{ listen, script: { exec } }] }];

describe('translate-postman-scripts worker', () => {
  beforeEach(() => {
    mockTranslatePostmanScript.mockReset();
  });

  it('carries each block measurement back to the main thread', () => {
    mockTranslatePostmanScript
      .mockReturnValueOnce({
        translated: 'bru.setEnvVar("k", "v");',
        usage: { apiCallsTotal: 1, apiCallsUntranslated: 0, untranslatedApis: {}, fellBackToRegex: false }
      })
      .mockReturnValueOnce({
        translated: 'pm.vault.get("k");',
        usage: { apiCallsTotal: 1, apiCallsUntranslated: 1, untranslatedApis: { 'pm.vault.get': 1 }, fellBackToRegex: false }
      });

    const result = runWorker([
      scriptEntry('a', ['pm.environment.set("k", "v");']),
      scriptEntry('b', ['pm.vault.get("k");'])
    ]);

    expect(result.map(([uid]) => uid)).toEqual(['a', 'b']);
    expect(result[1][1].scriptUsages).toEqual([
      { apiCallsTotal: 1, apiCallsUntranslated: 1, untranslatedApis: { 'pm.vault.get': 1 }, fellBackToRegex: false }
    ]);
  });

  it('omits a block the translator could not measure', () => {
    mockTranslatePostmanScript.mockReturnValue({ translated: '', usage: null });

    const [[, entry]] = runWorker([scriptEntry('a', ['   '])]);

    expect(entry.scriptUsages).toEqual([]);
  });
});
