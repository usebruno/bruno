import { ENTRY_KINDS, getBadge } from 'utils/request-source-badges';

export const FILTER_CHIPS = [
  { id: 'all', label: 'All' },
  { id: 'main', label: ENTRY_KINDS.main.chipLabel },
  { id: 'pre', label: ENTRY_KINDS.pre.chipLabel },
  { id: 'post', label: ENTRY_KINDS.post.chipLabel },
  { id: 'oauth', label: ENTRY_KINDS.oauth.chipLabel }
];

export { ENTRY_KINDS, getBadge };
