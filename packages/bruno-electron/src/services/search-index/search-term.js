/** Escape user input for SQLite LIKE with ESCAPE '\\'. */
const escapeLikePattern = (term) => {
  if (term == null) return '';
  return String(term)
    .replace(/\\/g, '\\\\')
    .replace(/%/g, '\\%')
    .replace(/_/g, '\\_');
};

const likePattern = (term) => `%${escapeLikePattern(term)}%`;

const normalizedNeedle = (term) => (typeof term === 'string' ? term.trim().toLowerCase() : '');

const collectionNameMatches = (name, term) => {
  const needle = normalizedNeedle(term);
  if (!needle) return false;
  return (name ?? '').toLowerCase().includes(needle);
};

module.exports = { escapeLikePattern, likePattern, collectionNameMatches, normalizedNeedle };
