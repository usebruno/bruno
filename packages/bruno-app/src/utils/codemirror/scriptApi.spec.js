const { describe, it, expect, jest } = require('@jest/globals');

import { findApiEntry, getApiEntries, getHintTexts, renderApiDoc } from './scriptApi';

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

  describe('findApiEntry', () => {
    it('finds a member available in the script', () => {
      expect(findApiEntry('bru.setEnvVar', 'pre-request').path).toBe('bru.setEnvVar');
    });

    it('finds nothing for a member of another script, or no member at all', () => {
      expect(findApiEntry('res.status', 'pre-request')).toBeNull();
      expect(findApiEntry('bru.noSuchMethod', 'tests')).toBeNull();
    });
  });

  describe('getHintTexts', () => {
    const entry = (path) => findApiEntry(path, 'post-response');

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

    it('offers the members of what a method returns, after the call', () => {
      const hints = (root, scriptType) => getApiEntries([root], scriptType).flatMap(getHintTexts);

      expect(hints('bru', 'pre-request')).toEqual(expect.arrayContaining([
        'bru.cookies.jar()',
        'bru.cookies.jar().getCookie(url, name, callback)',
        'bru.cookies.jar().getCookies(url, callback)',
        'bru.cookies.jar().setCookie(url, name, value, callback)',
        'bru.cookies.jar().setCookie(url, cookie, callback)',
        'bru.cookies.jar().setCookies(url, cookies, callback)',
        'bru.cookies.jar().hasCookie(url, name, callback)',
        'bru.cookies.jar().deleteCookie(url, name, callback)',
        'bru.cookies.jar().deleteCookies(url, callback)',
        'bru.cookies.jar().clear(callback)'
      ]));
      expect(hints('res', 'post-response')).toEqual(expect.arrayContaining([
        'res.getSize()',
        'res.getSize().header',
        'res.getSize().body',
        'res.getSize().total'
      ]));
    });
  });

  describe('renderApiDoc', () => {
    it('renders the full signature, the docs and an example', () => {
      const doc = renderApiDoc(findApiEntry('bru.setEnvVar', 'pre-request'));

      expect(doc.querySelector('[data-testid="api-doc-signature"]').textContent).toBe('bru.setEnvVar(key: string, value: any): void');
      expect(doc.textContent).toContain('Set a variable of the selected environment');
      expect(doc.querySelector('pre').textContent).toContain('bru.setEnvVar(');
    });

    it('renders a property\'s signature as its path and type, coloring the type', () => {
      const signature = renderApiDoc(findApiEntry('bru.cookies', 'pre-request')).querySelector('[data-testid="api-doc-signature"]');

      expect(signature.textContent).toBe('bru.cookies: CookieList');
      expect([...signature.querySelectorAll('span')].map((span) => [span.className, span.textContent])).toEqual([
        ['bruno-api-doc-type', 'CookieList']
      ]);
    });

    it('renders backticked text as code', () => {
      const doc = renderApiDoc(findApiEntry('req.getHeader', 'pre-request'));

      expect([...doc.querySelectorAll('p code')].map((code) => code.textContent)).toContain('req.headerList.get()');
    });

    it('copies the example, keeping the editor focused', async () => {
      const entry = findApiEntry('bru.setEnvVar', 'pre-request');
      const writeText = jest.fn(() => Promise.resolve());
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
      const button = renderApiDoc(entry).querySelector('[data-testid="api-doc-example-copy"]');

      const mousedown = new MouseEvent('mousedown', { bubbles: true, cancelable: true });
      button.dispatchEvent(mousedown);
      button.click();
      await Promise.resolve();

      expect(mousedown.defaultPrevented).toBe(true);
      expect(writeText).toHaveBeenCalledWith(entry.examples[0]);
      expect(button.classList.contains('copy-success')).toBe(true);
    });
  });
});
