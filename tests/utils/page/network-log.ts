import { Locator } from '../../../playwright';

/** One entry per request on the wire: a followed redirect logs every hop into the same trace. */
export const readRequestHops = async (root: Locator) => {
  const entries = await root.getByTestId('network-log-entry').evaluateAll((nodes) =>
    nodes.map((node) => ({
      type: node.getAttribute('data-log-type'),
      text: (node.textContent || '').trim()
    }))
  );

  const hops: Array<{ request: string; headerLines: string[]; responseHeaderLines: string[] }> = [];
  entries.forEach((entry) => {
    if (entry.type === 'request') {
      hops.push({ request: entry.text, headerLines: [], responseHeaderLines: [] });
      return;
    }

    const hop = hops[hops.length - 1];
    if (!hop) return;
    if (entry.type === 'requestHeader') hop.headerLines.push(entry.text);
    if (entry.type === 'responseHeader') hop.responseHeaderLines.push(entry.text);
  });

  return hops;
};

/** Only the last hop reached the server that produced the response, so that is what Request shows. */
export const readLastHopRequestHeaderLines = async (root: Locator) => {
  const hops = await readRequestHops(root);
  return hops.length ? hops[hops.length - 1].headerLines : [];
};
