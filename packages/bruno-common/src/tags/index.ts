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
 * Determines whether a request should be included based on its tags: if no includeTags are provided, all requests are included (unless excluded); otherwise, it must have at least one included tag and no excluded tags.
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
