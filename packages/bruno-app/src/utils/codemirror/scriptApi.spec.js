const { describe, it, expect } = require('@jest/globals');

import { findApiEntries, getApiEntries, getHintTexts, renderApiDoc } from './scriptApi';

const paths = (entries) => entries.map((entry) => entry.path);

describe('scriptApi', () => {
  describe('getApiEntries', () => {
    it('keeps to the requested globals', () => {
      const roots = new Set(paths(getApiEntries(['req'], 'pre-request')).map((path) => path.split('.')[0]));

      expect([...roots]).toEqual(['req']);
    });

    it('keeps to the members of the editor\'s script', () => {
      const preRequest = paths(getApiEntries(['req', 'res'], 'pre-request'));
      const tests = paths(getApiEntries(['req', 'res'], 'tests'));

      expect(preRequest).not.toContain('res.getStatus');
      expect(tests).toContain('res.getStatus');
    });

    it('reads a gRPC script type as its hook', () => {
      const beforeCallStart = paths(getApiEntries(['bru'], 'before-call-start'));
      const beforeMessageSend = paths(getApiEntries(['bru'], 'before-message-send'));

      expect(beforeCallStart).toContain('bru.grpc.request.metadata.upsert');
      expect(beforeCallStart).not.toContain('bru.grpc.request.message');
      expect(beforeMessageSend).toContain('bru.grpc.request.message');
      expect(beforeMessageSend).not.toContain('bru.grpc.request.metadata.upsert');
    });

    it('offers bru.grpc in gRPC hooks only', () => {
      expect(paths(getApiEntries(['bru'], 'post-response')).some((path) => path.startsWith('bru.grpc'))).toBe(false);
    });

    it('offers nothing without a script type', () => {
      expect(getApiEntries(['req', 'res', 'bru'])).toEqual([]);
    });
  });

  describe('findApiEntries', () => {
    it('finds a member available in the script', () => {
      expect(paths(findApiEntries('bru.setEnvVar', 'pre-request'))).toEqual(['bru.setEnvVar']);
    });

    it('finds nothing for a member of another script, or no member at all', () => {
      expect(findApiEntries('res.status', 'pre-request')).toEqual([]);
      expect(findApiEntries('bru.noSuchMethod', 'tests')).toEqual([]);
    });
  });

  describe('getHintTexts', () => {
    const entry = (path) => findApiEntries(path, 'post-response')[0];

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
      const doc = renderApiDoc(findApiEntries('bru.setEnvVar', 'pre-request')[0]);

      expect(doc.querySelector('[data-testid="api-doc-signature"]').textContent).toBe('bru.setEnvVar(key: string, value: any): void');
      expect(doc.textContent).toContain('Set a variable of the selected environment');
      expect(doc.querySelector('pre').textContent).toContain('bru.setEnvVar(');
    });

    it('renders backticked text as code', () => {
      const doc = renderApiDoc(findApiEntries('req.getHeader', 'pre-request')[0]);

      expect([...doc.querySelectorAll('p code')].map((code) => code.textContent)).toContain('req.headerList.get()');
    });

    it('notes a member Safe Mode does not provide', () => {
      const nodeVmOnly = renderApiDoc(findApiEntries('bru.utils', 'pre-request')[0]);
      const everywhere = renderApiDoc(findApiEntries('bru.setEnvVar', 'pre-request')[0]);

      expect(nodeVmOnly.querySelector('[data-testid="api-doc-safe-mode-note"]')).not.toBeNull();
      expect(everywhere.querySelector('[data-testid="api-doc-safe-mode-note"]')).toBeNull();
    });
  });
});
