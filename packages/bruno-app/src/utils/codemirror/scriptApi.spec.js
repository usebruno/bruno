const { describe, it, expect } = require('@jest/globals');

import {
  API_HINT_GROUPS,
  findApiEntries,
  getApiEntries,
  getHintTexts,
  getScriptContexts,
  renderApiDoc
} from './scriptApi';

const paths = (entries) => entries.map((entry) => entry.path);

describe('scriptApi', () => {
  describe('API_HINT_GROUPS', () => {
    it('lists the globals and every gRPC hook', () => {
      expect(API_HINT_GROUPS).toEqual(expect.arrayContaining([
        'bru',
        'req',
        'res',
        'grpc:before-call-start',
        'grpc:before-message-send',
        'grpc:after-message-receive',
        'grpc:after-call-end'
      ]));
    });
  });

  describe('getScriptContexts', () => {
    it('reads a pre-request editor from the absence of `res`', () => {
      expect(getScriptContexts(['req', 'bru'])).toEqual(['pre-request']);
    });

    it('reads a post-response or tests editor from `res`', () => {
      expect(getScriptContexts(['req', 'res', 'bru'])).toEqual(['post-response', 'tests']);
    });

    it('takes a gRPC hook editor at its hook', () => {
      expect(getScriptContexts(['bru', 'grpc:after-call-end'])).toEqual(['grpc:after-call-end']);
    });
  });

  describe('getApiEntries', () => {
    it('keeps to the requested globals', () => {
      const roots = new Set(paths(getApiEntries(['req'])).map((path) => path.split('.')[0]));

      expect([...roots]).toEqual(['req']);
    });

    it('keeps to the members of the editor\'s contexts', () => {
      const preRequest = paths(getApiEntries(['req', 'bru']));
      const tests = paths(getApiEntries(['req', 'res', 'bru']));

      expect(preRequest).toContain('req.onFail');
      expect(preRequest).not.toContain('bru.getAssertionResults');
      expect(tests).toContain('bru.getAssertionResults');
      expect(tests).not.toContain('req.onFail');
    });

    it('offers bru.grpc in gRPC hooks only', () => {
      expect(paths(getApiEntries(['bru', 'grpc:before-call-start']))).toContain('bru.grpc.request.metadata.upsert');
      expect(paths(getApiEntries(['req', 'res', 'bru'])).some((path) => path.startsWith('bru.grpc'))).toBe(false);
    });
  });

  describe('findApiEntries', () => {
    it('finds a member available in the given contexts', () => {
      expect(paths(findApiEntries('bru.setEnvVar', ['pre-request']))).toEqual(['bru.setEnvVar']);
    });

    it('finds nothing for a member of another context, or no member at all', () => {
      expect(findApiEntries('req.onFail', ['tests'])).toEqual([]);
      expect(findApiEntries('bru.noSuchMethod', ['tests'])).toEqual([]);
    });
  });

  describe('getHintTexts', () => {
    const entry = (path) => findApiEntries(path, ['post-response'])[0];

    it('names a property by its path', () => {
      expect(getHintTexts(entry('req.headerList'))).toEqual(['req.headerList']);
    });

    it('lists a method\'s parameters', () => {
      expect(getHintTexts(entry('bru.setEnvVar'))).toEqual(['bru.setEnvVar(key, value)']);
    });

    it('offers a method with optional parameters with and without them', () => {
      expect(getHintTexts(entry('req.headerList.has'))).toEqual([
        'req.headerList.has(nameOrItem)',
        'req.headerList.has(nameOrItem, value)'
      ]);
    });
  });

  describe('renderApiDoc', () => {
    it('renders the full signature, the docs and an example', () => {
      const doc = renderApiDoc(findApiEntries('bru.setEnvVar', ['pre-request'])[0]);

      expect(doc.querySelector('[data-testid="api-doc-signature"]').textContent).toBe('bru.setEnvVar(key: string, value: any): void');
      expect(doc.textContent).toContain('Set a variable of the selected environment');
      expect(doc.querySelector('pre').textContent).toContain('bru.setEnvVar(');
    });

    it('renders backticked text as code', () => {
      const doc = renderApiDoc(findApiEntries('req.getHeader', ['pre-request'])[0]);

      expect([...doc.querySelectorAll('p code')].map((code) => code.textContent)).toContain('req.headerList.get()');
    });

    it('notes a member Safe Mode does not provide', () => {
      const nodeVmOnly = renderApiDoc(findApiEntries('bru.utils', ['pre-request'])[0]);
      const everywhere = renderApiDoc(findApiEntries('bru.setEnvVar', ['pre-request'])[0]);

      expect(nodeVmOnly.querySelector('[data-testid="api-doc-safe-mode-note"]')).not.toBeNull();
      expect(everywhere.querySelector('[data-testid="api-doc-safe-mode-note"]')).toBeNull();
    });
  });
});
