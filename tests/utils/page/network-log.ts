import { Locator } from '../../../playwright';

/**
 * The network log (packages/bruno-app/.../Timeline/TimelineItem/Network) is rendered by both the
 * response pane's Timeline > Network tab and the DevTools console's request-details Network tab, so
 * reading it is shared here and each surface passes its own container.
 *
 * Returns the final hop's sent headers as "name: value" strings in render order.
 *
 * Scoped to the last hop deliberately: a followed redirect (or a digest/NTLM retry) logs every hop,
 * while the Request tab's headers table shows only the hop that produced the response. Comparing the
 * two therefore has to start at the last `request` marker, or a multi-hop request looks like a
 * mismatch when the views actually agree.
 */
export const readLastHopRequestHeaderLines = async (root: Locator) => {
  const entries = await root.getByTestId('network-log-entry').evaluateAll((nodes) =>
    nodes.map((node) => ({
      type: node.getAttribute('data-log-type'),
      text: (node.textContent || '').trim()
    }))
  );
  const hopStart = entries.reduce((last, entry, i) => (entry.type === 'request' ? i : last), 0);
  return entries.slice(hopStart).filter((entry) => entry.type === 'requestHeader').map((entry) => entry.text);
};
