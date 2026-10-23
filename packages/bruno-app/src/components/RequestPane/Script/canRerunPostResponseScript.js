/**
 * A post-response script can be re-run when the item holds a completed, non-streaming response
 * that was received for its latest request, and no other run is already in flight.
 */
export const canRerunPostResponseScript = (item, responseScript) => {
  const { response } = item;
  const hasScript = Boolean(responseScript && responseScript.trim().length > 0);
  const hasReusableResponse = Boolean(response && !response.error && !response.isError && !response.stream);

  return hasScript
    && hasReusableResponse
    && ['http-request', 'graphql-request'].includes(item.type)
    && item.requestState === 'received'
    && Boolean(item.requestUid)
    && !item.postResponseScriptRunning;
};
