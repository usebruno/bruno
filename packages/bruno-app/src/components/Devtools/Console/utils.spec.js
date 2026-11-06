import { getLogMessageParts } from './utils';

describe('getLogMessageParts', () => {
  it('splits http and https URLs into link parts', () => {
    expect(getLogMessageParts('Open https://example.com/docs and http://localhost:3000/path')).toEqual([
      { type: 'text', text: 'Open ' },
      { type: 'link', text: 'https://example.com/docs', url: 'https://example.com/docs' },
      { type: 'text', text: ' and ' },
      { type: 'link', text: 'http://localhost:3000/path', url: 'http://localhost:3000/path' }
    ]);
  });

  it('does not link bare domains or email addresses', () => {
    expect(getLogMessageParts('Contact user@example.com or visit example.com')).toEqual([
      { type: 'text', text: 'Contact user@example.com or visit example.com' }
    ]);
  });

  it('keeps balanced parentheses inside URL links', () => {
    expect(getLogMessageParts('Docs https://example.com/a(b) done')).toEqual([
      { type: 'text', text: 'Docs ' },
      { type: 'link', text: 'https://example.com/a(b)', url: 'https://example.com/a(b)' },
      { type: 'text', text: ' done' }
    ]);
  });
});
