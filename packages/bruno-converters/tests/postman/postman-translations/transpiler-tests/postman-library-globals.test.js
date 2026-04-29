import translateCode from '../../../../src/utils/postman-to-bruno-translator';

describe('Postman Library Globals Auto-Require Injection', () => {
  it('injects require for member-position usage (CryptoJS)', () => {
    const out = translateCode(`const h = CryptoJS.MD5('hello').toString();`);
    expect(out).toContain(`const CryptoJS = require("crypto-js")`);
    expect(out).toContain(`CryptoJS.MD5('hello')`);
  });

  it('injects require for call-position usage (moment)', () => {
    const out = translateCode(`const now = moment().format('YYYY');`);
    expect(out).toContain(`const moment = require("moment")`);
    expect(out).toContain(`moment().format('YYYY')`);
  });

  it('injects require for computed member access (CryptoJS["MD5"])', () => {
    const out = translateCode(`const h = CryptoJS['MD5']('hello').toString();`);
    expect(out).toContain(`const CryptoJS = require("crypto-js")`);
  });

  it('injects multiple requires in alphabetical order', () => {
    const out = translateCode(`
      const h = CryptoJS.MD5('x').toString();
      const c = _.chunk([1,2,3], 2);
      const t = moment().unix();
      const v = tv4.validate({}, {});
    `);
    const idxCrypto = out.indexOf(`require("crypto-js")`);
    const idxLodash = out.indexOf(`require("lodash")`);
    const idxMoment = out.indexOf(`require("moment")`);
    const idxTv4 = out.indexOf(`require("tv4")`);
    expect(idxCrypto).toBeGreaterThan(-1);
    expect(idxCrypto).toBeLessThan(idxLodash);
    expect(idxLodash).toBeLessThan(idxMoment);
    expect(idxMoment).toBeLessThan(idxTv4);
  });

  it('does not duplicate when require already exists', () => {
    const input = `const CryptoJS = require('crypto-js'); const h = CryptoJS.MD5('x');`;
    const out = translateCode(input);
    const matches = out.match(/require\(["']crypto-js["']\)/g) || [];
    expect(matches).toHaveLength(1);
  });

  it('does not inject when library name is only a property access', () => {
    const out = translateCode(`obj.CryptoJS.doThing();`);
    expect(out).not.toContain(`require("crypto-js")`);
  });

  it('does not inject on script with no library usage', () => {
    const input = `const x = 1 + 2;`;
    const out = translateCode(input);
    expect(out).not.toContain('require(');
    expect(out.trim()).toBe(input.trim());
  });

  it('still injects when name is shadowed only in an inner function/IIFE scope', () => {
    const out = translateCode(`
      (() => { const _ = 1; return _; })();
      _.chunk([1, 2], 1);
    `);
    expect(out).toContain(`const _ = require("lodash")`);
  });
});
