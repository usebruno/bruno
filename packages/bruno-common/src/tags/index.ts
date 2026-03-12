/**
 * Normalizes a tags value to an array of strings.
 * The BRU parser may return a single string when only one tag is defined.
 */
const toTagsArray = (tags: string | string[] | undefined | null): string[] => {
  if (!tags) return [];
  if (Array.isArray(tags)) return tags;
  return String(tags)
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean);
};

/**
 * A request should be included if it has at least one tag that is included and no tags that are excluded
 * @param requestTags Tags of the request (string or array — BRU parser may return either)
 * @param includeTags Tags to include
 * @param excludeTags Tags to exclude
 */
export const isRequestTagsIncluded = (
  requestTags: string | string[] | undefined | null,
  includeTags: string[],
  excludeTags: string[]
) => {
  const tags = toTagsArray(requestTags);
  const shouldInclude = includeTags.length === 0 || tags.some((tag) => includeTags.includes(tag));
  const shouldExclude = excludeTags.length > 0 && tags.some((tag) => excludeTags.includes(tag));
  return shouldInclude && !shouldExclude;
};

export default isRequestTagsIncluded;
