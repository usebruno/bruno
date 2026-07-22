'use strict';

const {
  findRemoteImageUrls,
  assetFilenameFor,
  buildModuleSource,
  normalizeDomains
} = require('./utils');

describe('remote-images utils', () => {
  describe('normalizeDomains', () => {
    it('trims, lowercases, and strips protocol/trailing slash', () => {
      expect([...normalizeDomains(['HTTPS://XYZ.com/', ' abc.com '])].sort()).toEqual([
        'abc.com',
        'xyz.com'
      ]);
    });
  });

  describe('findRemoteImageUrls', () => {
    it('returns empty when no domains configured', () => {
      expect(findRemoteImageUrls('![x](http://xyz.com/a.png)', [])).toEqual([]);
    });

    it('finds markdown image urls on matching domains', () => {
      const md = [
        '# Hello',
        '![AI](http://xyz.com/ai.png)',
        'Also https://xyz.com/other.jpg and http://other.com/skip.png',
        'Not an image: http://xyz.com/readme.md'
      ].join('\n');

      expect(findRemoteImageUrls(md, ['xyz.com'])).toEqual([
        'http://xyz.com/ai.png',
        'https://xyz.com/other.jpg'
      ]);
    });

    it('matches host:port domains', () => {
      const md = '![f](http://127.0.0.1:9876/ai.png)';
      expect(findRemoteImageUrls(md, ['127.0.0.1:9876'])).toEqual([
        'http://127.0.0.1:9876/ai.png'
      ]);
    });

    it('dedupes repeated urls', () => {
      const md = '![a](http://xyz.com/a.png) ![b](http://xyz.com/a.png)';
      expect(findRemoteImageUrls(md, ['xyz.com'])).toEqual(['http://xyz.com/a.png']);
    });
  });

  describe('assetFilenameFor', () => {
    it('uses content hash and url extension', () => {
      const buf = Buffer.from('hello');
      const name = assetFilenameFor(buf, 'http://xyz.com/path/ai.PNG');
      expect(name).toMatch(/^static\/media\/[a-f0-9]{16}\.png$/);
    });

    it('assetFilenameFromHash uses the provided hash', () => {
      const { assetFilenameFromHash } = require('./utils');
      expect(assetFilenameFromHash('abcdabcdabcdabcd', 'http://xyz.com/x.SVG')).toBe(
        'static/media/abcdabcdabcdabcd.svg'
      );
    });
  });

  describe('buildModuleSource', () => {
    it('exports a JSON string when nothing was rewritten', () => {
      expect(buildModuleSource('hello', new Map())).toBe('export default "hello";');
    });

    it('rewrites urls to relative static/media asset paths', () => {
      const source = '![AI](http://xyz.com/ai.png) done';
      const map = new Map([['http://xyz.com/ai.png', 'static/media/abc.png']]);
      const out = buildModuleSource(source, map);
      expect(out).toBe('export default "![AI](static/media/abc.png) done";');
    });

    it('escapes backticks and template markers in surrounding text', () => {
      const source = 'code `x` and ${y} ![a](http://xyz.com/a.png)';
      const map = new Map([['http://xyz.com/a.png', 'static/media/a.png']]);
      const out = buildModuleSource(source, map);
      // eslint-disable-next-line no-new-func -- evaluate the export expression shape
      const fn = new Function(`${out.replace('export default', 'return')}`);
      expect(fn()).toBe('code `x` and ${y} ![a](static/media/a.png)');
    });
  });
});
