/** Headers actually sent, from the timeline's `requestHeader` entries. A followed redirect logs one
 *  block per hop into the same timeline, so only the last block reached the server that responded. */
export const sentHeadersFromTimeline = (timeline) => {
  if (!Array.isArray(timeline)) return [];

  const headers = [];
  let foundBlock = false;

  /** Run the loop in backward to get latest `requestHeader` run: on a redirect each hop logs its own run, and the
   *  last one is the request that returned this response. `unshift` restores wire order */
  for (let i = timeline.length - 1; i >= 0; i--) {
    const item = timeline[i];
    const isHeader = item?.type === 'requestHeader';

    /** we go in backward as the first header found opens the last hop's run and the next non-header
     *  closes it, so the earlier hops above it are left alone. */
    if (foundBlock && !isHeader) break;
    if (!isHeader) continue;

    foundBlock = true;

    if (typeof item.message === 'string') {
      const separatorIdx = item.message.indexOf(':');
      if (separatorIdx !== -1) {
        headers.unshift({
          name: item.message.slice(0, separatorIdx).trim(),
          value: item.message.slice(separatorIdx + 1).trim()
        });
      }
    }
  }
  return headers;
};
