import { extendMatch, patchLinkifyToExtendUrls } from './index';

describe('Linkify Utils - extendMatch', () => {
  it('should leave the match unchanged when parentheses are already balanced', () => {
    const url = 'https://example.com/path?q=(a)';
    const text = `${url} end`;
    const match = { raw: url, url, text: url, lastIndex: url.length };

    const result = extendMatch(match, text);

    expect(result.raw).toBe(url);
    expect(result.url).toBe(url);
    expect(result.text).toBe(url);
    expect(result.lastIndex).toBe(url.length);
  });

  it('should extend raw, url, text and lastIndex to balance nested parentheses', () => {
    const url = 'https://example.com?_g=(a:!(),b:(c:d';
    const text = 'https://example.com?_g=(a:!(),b:(c:d))&_a=(e) end';
    const fullUrl = 'https://example.com?_g=(a:!(),b:(c:d))&_a=(e)';
    const match = { raw: url, url, text: url, lastIndex: url.length };

    const result = extendMatch(match, text);

    expect(result.raw).toBe(fullUrl);
    expect(result.url).toBe(fullUrl);
    expect(result.text).toBe(fullUrl);
    expect(result.lastIndex).toBe(fullUrl.length);
  });

  it('should mutate and return the same match object it was given', () => {
    const url = 'https://example.com?_g=(a';
    const text = 'https://example.com?_g=(a) end';
    const match = { raw: url, url, text: url, lastIndex: url.length };

    const result = extendMatch(match, text);

    expect(result).toBe(match);
  });

  it('should stop extending at whitespace', () => {
    const url = 'https://example.com?q=(a';
    const text = 'https://example.com?q=(a ) end';
    const match = { raw: url, url, text: url, lastIndex: url.length };

    const result = extendMatch(match, text);

    expect(result.url).toBe(url);
    expect(result.lastIndex).toBe(url.length);
  });
});

describe('Linkify Utils - patchLinkifyToExtendUrls', () => {
  const buildMarkdownItLike = ({ matchAtStartResult, matchResults }) => ({
    linkify: {
      matchAtStart: jest.fn().mockReturnValue(matchAtStartResult),
      match: jest.fn().mockReturnValue(matchResults)
    }
  });

  it('should return the same markdown-it instance it was given', () => {
    const md = buildMarkdownItLike({ matchAtStartResult: null, matchResults: null });

    const result = patchLinkifyToExtendUrls(md);

    expect(result).toBe(md);
  });

  it('should extend matches returned by linkify.matchAtStart', () => {
    const url = 'https://example.com?_g=(a:!(),b:(c:d';
    const text = 'https://example.com?_g=(a:!(),b:(c:d))&_a=(e) end';
    const fullUrl = 'https://example.com?_g=(a:!(),b:(c:d))&_a=(e)';
    const originalMatch = { raw: url, url, text: url, lastIndex: url.length };
    const md = buildMarkdownItLike({ matchAtStartResult: originalMatch, matchResults: null });

    patchLinkifyToExtendUrls(md);
    const result = md.linkify.matchAtStart(text);

    expect(result.url).toBe(fullUrl);
  });

  it('should return null from matchAtStart when there is no match', () => {
    const md = buildMarkdownItLike({ matchAtStartResult: null, matchResults: null });

    patchLinkifyToExtendUrls(md);

    expect(md.linkify.matchAtStart('no urls here')).toBeNull();
  });

  it('should extend every match returned by linkify.match', () => {
    const url1 = 'https://example.com/path?q=(a)';
    const url2 = 'https://example.com?_g=(a:!(),b:(c:d';
    const text = `${url1} https://example.com?_g=(a:!(),b:(c:d))&_a=(e) end`;
    const fullUrl2 = 'https://example.com?_g=(a:!(),b:(c:d))&_a=(e)';
    const matches = [
      { raw: url1, url: url1, text: url1, lastIndex: url1.length },
      { raw: url2, url: url2, text: url2, lastIndex: text.indexOf(url2) + url2.length }
    ];
    const md = buildMarkdownItLike({ matchAtStartResult: null, matchResults: matches });

    patchLinkifyToExtendUrls(md);
    const result = md.linkify.match(text);

    expect(result[0].url).toBe(url1);
    expect(result[1].url).toBe(fullUrl2);
  });

  it('should return null from match when there are no matches', () => {
    const md = buildMarkdownItLike({ matchAtStartResult: null, matchResults: null });

    patchLinkifyToExtendUrls(md);

    expect(md.linkify.match('no urls here')).toBeNull();
  });
});
