export const fromOpenCollectionTags = (tags?: unknown[] | null): string[] => {
  if (!Array.isArray(tags) || !tags.length) {
    return [];
  }

  return tags.map((t) => {
    if(t === null || t=== undefined) return null
    if(typeof t === "object") return ''
    return String(t).trim()
  }).filter(Boolean)
};
