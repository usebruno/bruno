import { validateInterpolatedUrl, validateTemplateUrl } from './url-validation';

describe('generate-code url validation', () => {
  describe('validateInterpolatedUrl', () => {
    it.each([
      ['https://api.example.com/ping'],
      ['http://localhost:6000/values:colon'],
      ['https://api.example.com/users/123?page=1']
    ])('accepts a fully resolved URL — %s', (url) => {
      expect(validateInterpolatedUrl(url)).toBe(true);
    });

    // BRU-2095: the snippet is meant to be copy-pasteable, so a variable that never
    // resolved has to be surfaced rather than shipped into the generated code.
    it.each([
      ['{{missingHost}}/ping'],
      ['http://example.com/users/{{missingId}}'],
      ['http://example.com/get?token={{missingToken}}']
    ])('rejects a URL with an unresolved variable — %s', (url) => {
      expect(validateInterpolatedUrl(url)).toBe(false);
    });

    it.each([[''], ['not a url'], [undefined]])('rejects a malformed URL — %s', (url) => {
      expect(validateInterpolatedUrl(url)).toBe(false);
    });
  });

  describe('validateTemplateUrl', () => {
    // Interpolation off renders the URL as typed, so an unresolved variable is not an
    // error here — the snippet shows the `{{var}}` and the user resolves it downstream.
    it.each([
      ['variable host', '{{host}}/ping'],
      ['unresolved variable host', '{{missingHost}}/ping'],
      ['variable scheme', '{{proto}}://api.example.com/ping'],
      ['variable path segment', 'https://api.example.com/users/{{userId}}'],
      ['variable query value', 'https://api.example.com/get?token={{apiKey}}'],
      ['variable everywhere', '{{proto}}://{{host}}/{{version}}/users/{{userId}}'],
      ['no variables at all', 'https://api.example.com/ping'],
      ['schemeless host:port', 'localhost:6000/echo-request'],
      ['colon inside a path segment', 'http://localhost:6000/values:colon']
    ])('accepts a template URL — %s', (_label, url) => {
      expect(validateTemplateUrl(url)).toBe(true);
    });

    it.each([
      ['empty', ''],
      ['undefined', undefined],
      ['prose rather than a URL', 'not a url'],
      ['a space in the authority', 'https://api example.com/ping']
    ])('rejects a malformed URL — %s', (_label, url) => {
      expect(validateTemplateUrl(url)).toBe(false);
    });
  });
});
