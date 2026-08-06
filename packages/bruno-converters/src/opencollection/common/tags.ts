export const fromOpenCollectionTags = (tags?: unknown[] | null): string[] => {
  if (!Array.isArray(tags) || !tags.length) {
    return [];
  }

  return tags
    .filter((t) => t != null && t !== '')
    .map((t) => String(t))
    .filter((t) => t.length > 0);
};
