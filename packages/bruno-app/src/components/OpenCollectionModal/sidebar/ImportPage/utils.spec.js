import { isZipUrl, tidyPastedText } from './utils';

describe('isZipUrl', () => {
  it.each([
    'https://a.dev/orders.zip',
    'http://a.dev/ORDERS.ZIP',
    'https://a.dev/orders.zip?token=1'
  ])('recognises %s as a ZIP URL', (text) => {
    expect(isZipUrl(text)).toBe(true);
  });

  it.each([
    'https://a.dev/spec.yaml',
    'https://a.dev/orders.zip.json',
    'orders.zip',
    '{ "name": "orders.zip" }'
  ])('does not treat %s as a ZIP URL', (text) => {
    expect(isZipUrl(text)).toBe(false);
  });
});

describe('tidyPastedText', () => {
  it.each([
    ['Windows line endings', 'openapi: 3.0.0\r\ninfo:\r\n  title: Orders', 'openapi: 3.0.0\ninfo:\n  title: Orders'],
    ['blank lines around the text', '\n \n{ "info": {} }\n\n', '{ "info": {} }'],
    ['spaces around a single line', '  https://a.dev/spec.yaml  \t\n', 'https://a.dev/spec.yaml'],
    ['the indentation of the first of several lines', '\n  openapi: 3.0.0\n  info: {}\n', '  openapi: 3.0.0\n  info: {}'],
    ['nothing but white space', ' \r\n\t ', '']
  ])('handles %s', (_description, pasted, tidied) => {
    expect(tidyPastedText(pasted)).toBe(tidied);
  });
});
