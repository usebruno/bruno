/**
 * @jest-environment node
 */
import { getRequestFileExtension } from './utils';

describe('getRequestFileExtension', () => {
  it('uses the current request filename extension when available', () => {
    expect(getRequestFileExtension('request.yml', 'bru')).toBe('yml');
  });

  it('falls back to the collection format when the item has no filename extension', () => {
    expect(getRequestFileExtension('request', 'bru')).toBe('bru');
  });
});
