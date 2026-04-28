const MODE_MAP = {
  'application/javascript': 'javascript',
  'javascript': 'javascript',
  'application/ld+json': 'json',
  'application/json': 'json',
  'application/xml': 'xml',
  'xml': 'xml',
  'application/html': 'html',
  'html': 'html',
  'application/yaml': 'yaml',
  'yaml': 'yaml',
  'application/text': 'plaintext',
  'text/plain': 'plaintext',
  'markdown': 'markdown',
  'shell': 'shell',
  'application/sparql-query': 'plaintext',
  'graphql': 'plaintext'
};

/**
 * Maps a CodeMirror mode string to a Monaco Editor language ID.
 * @param {string} mode - CodeMirror mode (e.g. 'application/javascript')
 * @returns {string} Monaco language ID (e.g. 'javascript')
 */
export const mapCodeMirrorModeToMonaco = (mode) => {
  if (!mode) return 'plaintext';
  return MODE_MAP[mode] || 'plaintext';
};
