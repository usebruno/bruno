// Keys must match getEntryKind() in buildEntries.js.
export const ENTRY_KINDS = {
  main: { chipLabel: 'Main', badgeLabel: 'main', badgeClass: 'tl-badge tl-badge--main' },
  oauth: { chipLabel: 'OAuth', badgeLabel: 'oauth2.0', badgeClass: 'tl-badge tl-badge--oauth2' },
  pre: { chipLabel: 'Pre-Request', badgeLabel: 'sendRequest', badgeClass: 'tl-badge tl-badge--scripted' },
  post: { chipLabel: 'Post-Response', badgeLabel: 'runRequest', badgeClass: 'tl-badge tl-badge--run-request' }
};

export const FILTER_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'main', label: ENTRY_KINDS.main.chipLabel },
  { id: 'pre', label: ENTRY_KINDS.pre.chipLabel },
  { id: 'post', label: ENTRY_KINDS.post.chipLabel },
  { id: 'oauth', label: ENTRY_KINDS.oauth.chipLabel }
];

export const getBadge = ({ source, isOauth2 }) => {
  if (isOauth2) return ENTRY_KINDS.oauth;
  if (!source || source === 'main') return ENTRY_KINDS.main;
  if (source === 'runRequest') return ENTRY_KINDS.post;
  return ENTRY_KINDS.pre;
};
