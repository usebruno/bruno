const { escapeLikePattern, likePattern, collectionNameMatches } = require('../../src/services/search-index/search-term');

describe('search-term', () => {
  it('escapes LIKE metacharacters', () => {
    expect(escapeLikePattern('100%_done')).toBe('100\\%\\_done');
    expect(likePattern('a\\b')).toBe('%a\\\\b%');
  });

  it('matches collection names case-insensitively', () => {
    expect(collectionNameMatches('Payments-edge', '-edge')).toBe(true);
    expect(collectionNameMatches('Payments-edge', 'widget')).toBe(false);
  });
});
