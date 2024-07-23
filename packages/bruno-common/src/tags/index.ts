/**
 * A request should be included if it has at least one tag that is included and no tags that are excluded
 * @param requestTags Tags of the request
 * @param includeTags Tags to include
 * @param excludeTags Tags to exclude
 */
export const isRequestTagsIncluded = (requestTags: string[], includeTags: string[], excludeTags: string[]) => {
  const shouldInclude = includeTags.length === 0 || requestTags.some((tag) => includeTags.includes(tag));
  const shouldExclude = excludeTags.length > 0 && requestTags.some((tag) => excludeTags.includes(tag));
  return shouldInclude && !shouldExclude;
};

export default isRequestTagsIncluded;
