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
        getLine: () => text,
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
      detach = attachApiInfo(cm, { showHintsFor: ['req', 'bru'] });

      hover({ line: 0, ch: 6 });

      expect(tooltip()).not.toBeNull();
      expect(tooltip().textContent).toContain('bru.setEnvVar(key: string, value: any): void');
    });

    it('shows nothing for a member the editor\'s context does not have', () => {
      editorWith('req.onFail(() => {});');
      detach = attachApiInfo(cm, { showHintsFor: ['req', 'res', 'bru'] });

      hover({ line: 0, ch: 6 });

      expect(tooltip()).toBeNull();
    });

    it('shows nothing inside a string', () => {
      editorWith('const text = \'bru.setEnvVar\';', 'string');
      detach = attachApiInfo(cm, { showHintsFor: ['req', 'bru'] });

      hover({ line: 0, ch: 20 });

      expect(tooltip()).toBeNull();
    });

    it('closes the tooltip when the pointer leaves the editor, and when detached', () => {
      editorWith('bru.setEnvVar(\'token\', \'x\');');
      detach = attachApiInfo(cm, { showHintsFor: ['req', 'bru'] });

      hover({ line: 0, ch: 6 });
      wrapper.dispatchEvent(new MouseEvent('mouseleave'));
      expect(tooltip()).toBeNull();

      hover({ line: 0, ch: 6 });
      detach();
      detach = null;
      expect(tooltip()).toBeNull();
    });
  });
});
