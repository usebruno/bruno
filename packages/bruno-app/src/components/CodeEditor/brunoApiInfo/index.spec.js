const { describe, it, expect, jest, beforeEach, afterEach } = require('@jest/globals');

import { attachApiInfo, getApiPathAt } from './index';

describe('brunoApiInfo', () => {
  describe('getApiPathAt', () => {
    const line = 'const env = bru.setEnvVar(\'token\', res.body.token);';

    it('reads the path ending at the identifier under the pointer', () => {
      expect(getApiPathAt(line, line.indexOf('setEnvVar') + 3)).toEqual({ path: 'bru.setEnvVar', start: line.indexOf('bru') });
      expect(getApiPathAt(line, line.indexOf('bru') + 1)).toEqual({ path: 'bru', start: line.indexOf('bru') });
    });

    it('stops at the identifier under the pointer', () => {
      expect(getApiPathAt(line, line.indexOf('body') + 1).path).toBe('res.body');
    });

    it('reads nested paths', () => {
      expect(getApiPathAt('req.headerList.upsert(h)', 16).path).toBe('req.headerList.upsert');
    });

    it('finds nothing off an identifier', () => {
      expect(getApiPathAt(line, line.indexOf('('))).toBeNull();
      expect(getApiPathAt(line, line.indexOf('.setEnvVar'))).toBeNull();
      expect(getApiPathAt(line, line.length)).toBeNull();
    });

    it('finds nothing on a member of a call result', () => {
      const jarLine = 'bru.cookies.jar().getCookie(url, name)';

      expect(getApiPathAt(jarLine, jarLine.indexOf('getCookie') + 1)).toBeNull();
    });
  });

  describe('attachApiInfo', () => {
    let wrapper;
    let cm;
    let detach;

    const tooltip = () => document.querySelector('[data-testid="api-info-tooltip"]');

    const hover = (pointer) => {
      cm.coordsChar.mockReturnValue(pointer);
      wrapper.dispatchEvent(new MouseEvent('mousemove', { clientX: 10, clientY: 10 }));
      jest.runAllTimers();
    };

    const editorWith = (text, tokenType = 'variable') => {
      wrapper = document.createElement('div');
      document.body.appendChild(wrapper);
      cm = {
        getWrapperElement: () => wrapper,
        coordsChar: jest.fn(),
        getLine: (line) => text.split('\n')[line],
        getTokenAt: () => ({ type: tokenType }),
        charCoords: () => ({ left: 10, top: 10, bottom: 20 }),
        on: jest.fn(),
        off: jest.fn()
      };
    };

    beforeEach(() => {
      jest.useFakeTimers();
    });

    afterEach(() => {
      detach?.();
      wrapper?.remove();
      jest.useRealTimers();
    });

    it('shows the docs of a hovered member', () => {
      editorWith('bru.setEnvVar(\'token\', \'x\');');
      detach = attachApiInfo(cm, { scriptType: 'pre-request' });

      hover({ line: 0, ch: 6 });

      expect(tooltip()).not.toBeNull();
      expect(tooltip().textContent).toContain('bru.setEnvVar(key: string, value: any): void');
    });

    it('moves the tooltip to another occurrence of the same member', () => {
      editorWith('bru.setEnvVar(\'token\', \'x\');\n\nbru.setEnvVar(\'id\', 1);');
      cm.charCoords = ({ line }) => ({ left: 10, top: line * 20, bottom: line * 20 + 10 });
      detach = attachApiInfo(cm, { scriptType: 'pre-request' });

      hover({ line: 0, ch: 6 });
      expect(tooltip().style.top).toBe('14px');

      hover({ line: 2, ch: 6 });
      expect(document.querySelectorAll('[data-testid="api-info-tooltip"]')).toHaveLength(1);
      expect(tooltip().style.top).toBe('54px');
    });

    it('keeps the tooltip when the same occurrence is hovered again', () => {
      editorWith('bru.setEnvVar(\'token\', \'x\');');
      detach = attachApiInfo(cm, { scriptType: 'pre-request' });

      hover({ line: 0, ch: 6 });
      const shown = tooltip();
      hover({ line: 0, ch: 8 });

      expect(tooltip()).toBe(shown);
    });

    it('shows the docs on the right half of a name\'s last letter', () => {
      const text = 'bru.setEnvVar';
      editorWith(text);
      detach = attachApiInfo(cm, { scriptType: 'pre-request' });

      hover({ line: 0, ch: text.length, sticky: 'before', xRel: -2 });

      expect(tooltip()).not.toBeNull();
    });

    it('shows nothing past the end of a line or below the last line', () => {
      const text = 'bru.setEnvVar';
      editorWith(text);
      detach = attachApiInfo(cm, { scriptType: 'pre-request' });

      hover({ line: 0, ch: text.length, sticky: 'before', xRel: 40 });
      expect(tooltip()).toBeNull();

      hover({ line: 0, ch: text.length, sticky: 'before', xRel: 1, outside: 1 });
      expect(tooltip()).toBeNull();
    });

    it('shows nothing left of the text, over the gutter or the line\'s padding', () => {
      editorWith('bru.setEnvVar(\'token\', \'x\');');
      detach = attachApiInfo(cm, { scriptType: 'pre-request' });

      hover({ line: 0, ch: 0, sticky: 'after', xRel: -4 });
      expect(tooltip()).toBeNull();

      hover({ line: 0, ch: 0, sticky: 'after', xRel: 1 });
      expect(tooltip()).not.toBeNull();
    });

    it('shows nothing for a member the editor\'s context does not have', () => {
      editorWith('res.getStatus();');
      detach = attachApiInfo(cm, { scriptType: 'pre-request' });

      hover({ line: 0, ch: 6 });

      expect(tooltip()).toBeNull();
    });

    it('shows nothing inside a string', () => {
      editorWith('const text = \'bru.setEnvVar\';', 'string');
      detach = attachApiInfo(cm, { scriptType: 'pre-request' });

      hover({ line: 0, ch: 20 });

      expect(tooltip()).toBeNull();
    });

    it('closes the tooltip when the pointer leaves the editor, and when detached', () => {
      editorWith('bru.setEnvVar(\'token\', \'x\');');
      detach = attachApiInfo(cm, { scriptType: 'pre-request' });

      hover({ line: 0, ch: 6 });
      wrapper.dispatchEvent(new MouseEvent('mouseleave'));
      expect(tooltip()).toBeNull();

      hover({ line: 0, ch: 6 });
      detach();
      detach = null;
      expect(tooltip()).toBeNull();
    });

    it('closes the tooltip when a key is pressed, and when the editor scrolls', () => {
      editorWith('bru.setEnvVar(\'token\', \'x\');');
      detach = attachApiInfo(cm, { scriptType: 'pre-request' });
      const handler = (event) => cm.on.mock.calls.find(([name]) => name === event)[1];

      hover({ line: 0, ch: 6 });
      expect(tooltip()).not.toBeNull();
      handler('keydown')();
      expect(tooltip()).toBeNull();

      hover({ line: 0, ch: 6 });
      expect(tooltip()).not.toBeNull();
      handler('scroll')();
      expect(tooltip()).toBeNull();
    });
  });
});
