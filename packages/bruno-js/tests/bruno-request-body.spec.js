const { describe, it, expect } = require('@jest/globals');
const BrunoRequest = require('../src/bruno-request');

const JSON_BODY = '{"name":"bruno"}';

const makeReq = (overrides = {}) => ({
  url: 'http://localhost:5000/api',
  method: 'POST',
  headers: {},
  data: JSON_BODY,
  ...overrides
});

describe('BrunoRequest - JSON body by Content-Type', () => {
  describe('getBody()', () => {
    it.each([
      'application/json',
      'application/json; charset=utf-8',
      'Application/JSON'
    ])('returns the parsed body when Content-Type is "%s"', (contentType) => {
      const req = new BrunoRequest(makeReq({ headers: { 'Content-Type': contentType } }));

      const body = req.getBody();

      expect(body).toEqual({ name: 'bruno' });
    });

    it('returns the raw string when only the multipart boundary contains "json"', () => {
      const req = new BrunoRequest(makeReq({ headers: { 'Content-Type': 'multipart/form-data; boundary=json-boundary' } }));

      const body = req.getBody();

      expect(body).toBe(JSON_BODY);
    });
  });

  describe('setBody()', () => {
    it('stringifies an object body when Content-Type is mixed-case JSON', () => {
      const rawReq = makeReq({ headers: { 'Content-Type': 'Application/JSON' } });
      const req = new BrunoRequest(rawReq);

      req.setBody({ name: 'bruno' });

      expect(rawReq.data).toBe(JSON_BODY);
    });

    it('keeps an object body as-is when only the multipart boundary contains "json"', () => {
      const rawReq = makeReq({ headers: { 'Content-Type': 'multipart/form-data; boundary=json-boundary' } });
      const req = new BrunoRequest(rawReq);
      const fields = { name: 'bruno' };

      req.setBody(fields);

      expect(rawReq.data).toBe(fields);
    });
  });
});
