/**
 * @param {string} name - collection display name
 * @returns {string}
 */
export const collectionSlug = (name) => (name || '').replace(/\s+/g, '-').toLowerCase();

export default collectionSlug;
