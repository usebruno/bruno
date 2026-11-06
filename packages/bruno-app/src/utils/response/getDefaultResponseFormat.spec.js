import { getDefaultResponseFormat } from './index';

describe('getDefaultResponseFormat', () => {
  it('detects formats from the content type', () => {
    expect(getDefaultResponseFormat('application/json')).toEqual({ format: 'json', tab: 'editor' });
    expect(getDefaultResponseFormat('text/html; charset=utf-8')).toEqual({ format: 'html', tab: 'preview' });
    expect(getDefaultResponseFormat('application/xml')).toEqual({ format: 'xml', tab: 'editor' });
  });

  it('falls back to raw for unknown and generic text types by default', () => {
    expect(getDefaultResponseFormat('text/plain')).toEqual({ format: 'raw', tab: 'editor' });
    expect(getDefaultResponseFormat('application/octet-stream')).toEqual({ format: 'raw', tab: 'editor' });
  });

  it('falls back to json for unknown and generic text types when detection is json', () => {
    expect(getDefaultResponseFormat('text/plain', { detection: 'json' })).toEqual({ format: 'json', tab: 'editor' });
    expect(getDefaultResponseFormat('application/octet-stream', { detection: 'json' })).toEqual({ format: 'json', tab: 'editor' });
  });

  it('keeps detected formats when detection is json', () => {
    expect(getDefaultResponseFormat('text/html', { detection: 'json' })).toEqual({ format: 'html', tab: 'preview' });
    expect(getDefaultResponseFormat('image/png', { detection: 'json' })).toEqual({ format: 'base64', tab: 'preview' });
  });
});
