import { ENTRY_KINDS, getBadge } from './request-source-badges';

describe('request-source-badges', () => {
  it('returns the main badge when source is missing', () => {
    expect(getBadge({ source: undefined, isOauth2: false })).toEqual(ENTRY_KINDS.main);
  });

  it('returns the pre-request badge for sendRequest sources', () => {
    expect(getBadge({ source: 'sendRequest', isOauth2: false })).toEqual(ENTRY_KINDS.pre);
  });

  it('returns the post-response badge for runRequest sources', () => {
    expect(getBadge({ source: 'runRequest', isOauth2: false })).toEqual(ENTRY_KINDS.post);
  });

  it('returns the oauth badge for oauth entries regardless of source', () => {
    expect(getBadge({ source: 'sendRequest', isOauth2: true })).toEqual(ENTRY_KINDS.oauth);
  });
});
