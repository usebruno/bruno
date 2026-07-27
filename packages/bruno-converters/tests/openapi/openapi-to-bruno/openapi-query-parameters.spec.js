import { describe, it, expect } from '@jest/globals';
import openApiToBruno from '../../../src/openapi/openapi-to-bruno';

const specWith = (params) => `
openapi: '3.0.0'
info:
  title: 'Query Params API'
  version: '1.0.0'
servers:
  - url: 'https://api.example.com'
paths:
  /search:
    get:
      summary: 'Search'
      operationId: 'search'
      parameters:
${params}
      responses:
        '200':
          description: 'OK'
`;

const search = (spec, options) =>
  openApiToBruno(spec, options).items.find((i) => i.name === 'Search').request;

describe('openapi query parameter import', () => {
  describe('syncing enabled query params into the URL', () => {
    it('appends enabled query params to the request URL', () => {
      const request = search(
        specWith(`        - name: q
          in: query
          required: true
          schema:
            type: string
            example: hello`)
      );

      expect(request.url).toBe('{{baseUrl}}/search?q=hello');
    });

    it('keeps disabled query params out of the URL', () => {
      const request = search(
        specWith(`        - name: q
          in: query
          required: true
          schema:
            type: string
            example: hello
        - name: page
          in: query
          required: false
          schema:
            type: string`)
      );

      expect(request.url).toContain('q=hello');
      expect(request.url).not.toContain('page');
      expect(request.params).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'page', type: 'query', enabled: false })
        ])
      );
    });
  });

  describe('enableOptionalParameters option', () => {
    const spec = specWith(`        - name: q
          in: query
          required: true
          schema:
            type: string
            example: hello
        - name: normalise
          in: query
          required: false
          schema:
            type: boolean
            default: true`);

    it('ticks optional params carrying a default by default (unchanged behaviour)', () => {
      const request = search(spec);

      expect(request.params).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'normalise', enabled: true })
        ])
      );
      expect(request.url).toContain('normalise=true');
    });

    it('unticks optional params and drops them from the URL when disabled', () => {
      const request = search(spec, { enableOptionalParameters: false });

      expect(request.params).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'q', enabled: true }),
          expect.objectContaining({ name: 'normalise', enabled: false })
        ])
      );
      expect(request.url).toBe('{{baseUrl}}/search?q=hello');
    });

    it('unticks every entry of an optional enum param when disabled', () => {
      const request = search(
        specWith(`        - name: mode
          in: query
          required: false
          schema:
            type: string
            enum: [a, b, c]
            default: b`),
        { enableOptionalParameters: false }
      );

      const modeParams = request.params.filter((p) => p.name === 'mode');
      expect(modeParams.length).toBeGreaterThan(0);
      expect(modeParams.every((p) => p.enabled === false)).toBe(true);
      expect(request.url).not.toContain('mode');
    });

    it('keeps required params ticked while unticking optional ones', () => {
      const request = search(
        specWith(`        - name: reqd
          in: query
          required: true
          schema:
            type: string
        - name: opt
          in: query
          required: false
          schema:
            type: string
            example: something`),
        { enableOptionalParameters: false }
      );

      expect(request.params).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ name: 'reqd', enabled: true }),
          expect.objectContaining({ name: 'opt', enabled: false })
        ])
      );
    });
  });
});
