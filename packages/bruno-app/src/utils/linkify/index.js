import { extendUrlWithBalancedParentheses } from 'utils/codemirror/linkAware';

export function extendMatch(match, text) {
  const extended = extendUrlWithBalancedParentheses(match.raw, text, match.lastIndex);
  const addedSuffix = extended.url.slice(match.raw.length);
  if (!addedSuffix) return match;

  match.raw += addedSuffix;
  match.url += addedSuffix;
  match.text += addedSuffix;
  match.lastIndex = extended.lastIndex;

  return match;
}

export function patchLinkifyToExtendUrls(md) {
  const originalMatchAtStart = md.linkify.matchAtStart.bind(md.linkify);
  md.linkify.matchAtStart = (text) => {
    const match = originalMatchAtStart(text);
    return match ? extendMatch(match, text) : match;
  };

  const originalMatch = md.linkify.match.bind(md.linkify);
  md.linkify.match = (text) => {
    const matches = originalMatch(text);
    return matches ? matches.map((match) => extendMatch(match, text)) : matches;
  };

  return md;
}
