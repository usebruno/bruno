import { get } from 'lodash';
import { resolveInheritedAuth } from 'utils/auth';

/**
 * Get request data from item (normal request, not example)
 */
export const getNormalRequestData = (item) => {
  const requestUrl = get(item, 'draft.request.url') !== undefined
    ? get(item, 'draft.request.url')
    : get(item, 'request.url');
  const requestParams = get(item, 'draft.request.params') !== undefined
    ? get(item, 'draft.request.params')
    : get(item, 'request.params');

  return {
    url: requestUrl,
    params: requestParams,
    request: get(item, 'draft.request') !== undefined
      ? get(item, 'draft.request')
      : get(item, 'request')
  };
};

/**
 * Get request data from example
 */
export const getExampleRequestData = (item, exampleUid) => {
  if (!exampleUid) {
    return getNormalRequestData(item);
  }

  const examples = item.draft
    ? get(item, 'draft.examples', [])
    : get(item, 'examples', []);
  const example = examples.find((e) => e.uid === exampleUid);

  if (!example) {
    return getNormalRequestData(item);
  }

  return {
    url: get(example, 'request.url'),
    params: get(example, 'request.params'),
    request: get(example, 'request')
  };
};

/**
 * Get request data based on whether it's an example or normal request
 */
export const getRequestData = (item, isExample, exampleUid) => {
  return isExample
    ? getExampleRequestData(item, exampleUid)
    : getNormalRequestData(item);
};

/**
 * Build the final item for code generation with resolved auth.
 *
 * We explicitly set auth from resolvedRequest to ensure inherited auth
 * (from folders/collection) is resolved correctly in generated code.
 */
export const buildFinalItem = ({ item, collection, isExample, exampleUid, finalUrl }) => {
  const requestData = getRequestData(item, isExample, exampleUid);
  const resolvedRequest = resolveInheritedAuth(item, collection);

  return {
    ...item,
    request: {
      ...requestData.request,
      auth: resolvedRequest.auth,
      url: finalUrl
    }
  };
};
