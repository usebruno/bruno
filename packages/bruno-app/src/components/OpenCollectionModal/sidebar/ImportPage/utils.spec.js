import { isZipUrl } from './utils';

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
