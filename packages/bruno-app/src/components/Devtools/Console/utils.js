import LinkifyIt from 'linkify-it';
import { extendUrlWithBalancedParentheses } from 'utils/codemirror/linkAware';

const linkify = new LinkifyIt().set({
  fuzzyEmail: false,
  fuzzyIP: false,
  fuzzyLink: false
});

const hasSupportedProtocol = (url) => /^https?:\/\//i.test(url);

export const getLogMessageParts = (message) => {
  const text = String(message ?? '');
  const matches = linkify.match(text)?.filter((match) => hasSupportedProtocol(match.url));

  if (!matches?.length) {
    return [{ type: 'text', text }];
  }

  const parts = [];
  let cursor = 0;

  for (const match of matches) {
    const raw = text.slice(match.index, match.lastIndex);
    const extended = extendUrlWithBalancedParentheses(raw, text, match.lastIndex);

    if (match.index > cursor) {
      parts.push({ type: 'text', text: text.slice(cursor, match.index) });
    }

    parts.push({
      type: 'link',
      text: text.slice(match.index, extended.lastIndex),
      url: extended.url
    });
    cursor = extended.lastIndex;
  }

  if (cursor < text.length) {
    parts.push({ type: 'text', text: text.slice(cursor) });
  }

  return parts;
};
