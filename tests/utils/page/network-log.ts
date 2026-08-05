import { Locator } from '../../../playwright';

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
