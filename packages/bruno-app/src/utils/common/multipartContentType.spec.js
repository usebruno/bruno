const { describe, it, expect } = require('@jest/globals');
import mime from 'mime-types';

import { getMultipartAutoContentType } from './multipartContentType';

describe('getMultipartAutoContentType', () => {
  describe('empty input', () => {
    it('returns empty string for an empty array', () => {
      expect(getMultipartAutoContentType([])).toBe('');
    });

    it('returns empty string for undefined', () => {
      expect(getMultipartAutoContentType(undefined)).toBe('');
    });

    it('returns empty string for null', () => {
      expect(getMultipartAutoContentType(null)).toBe('');
    });

    it('returns empty string for non-array input', () => {
      expect(getMultipartAutoContentType('foo.png')).toBe('');
    });
  });

  describe('single file', () => {
    it('detects content type for a png from extension', () => {
      expect(getMultipartAutoContentType(['photo.png'])).toBe(mime.contentType('.png'));
    });

    it('detects content type for a pdf', () => {
      expect(getMultipartAutoContentType(['document.pdf'])).toBe(mime.contentType('.pdf'));
    });

    it('detects content type for json', () => {
      expect(getMultipartAutoContentType(['payload.json'])).toBe(mime.contentType('.json'));
    });

    it('detects content type when file has a relative path', () => {
      expect(getMultipartAutoContentType(['assets/icons/logo.svg'])).toBe(mime.contentType('.svg'));
    });

    it('detects content type when file has an absolute path', () => {
      expect(getMultipartAutoContentType(['/tmp/uploads/data.csv'])).toBe(mime.contentType('.csv'));
    });

    it('returns empty string for a file with an unknown extension', () => {
      expect(getMultipartAutoContentType(['weirdfile.qqqzzz'])).toBe('');
    });
  });

  describe('multiple files', () => {
    it('returns multipart/mixed for two files of the same type', () => {
      expect(getMultipartAutoContentType(['a.png', 'b.png'])).toBe('multipart/mixed');
    });

    it('returns multipart/mixed for two files of different types', () => {
      expect(getMultipartAutoContentType(['a.png', 'b.pdf'])).toBe('multipart/mixed');
    });

    it('returns multipart/mixed for three or more files', () => {
      expect(getMultipartAutoContentType(['a.png', 'b.pdf', 'c.json'])).toBe('multipart/mixed');
    });

    it('returns multipart/mixed even when one file has an unknown extension', () => {
      expect(getMultipartAutoContentType(['a.png', 'unknownfile'])).toBe('multipart/mixed');
    });
  });
});
