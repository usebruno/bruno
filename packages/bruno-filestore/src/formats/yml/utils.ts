import * as YAML from 'yaml';

// Top-level keys that should have a blank line before them
const BLOCK_KEYS = ['info', 'http', 'graphql', 'grpc', 'websocket', 'runtime', 'settings', 'examples', 'docs', 'items', 'request'];

export const stringifyYml = (obj: any): string => {
  const yamlStr = YAML.stringify(obj, {
    lineWidth: 0,
    indent: 2,
    minContentWidth: 0,
    defaultStringType: 'PLAIN'
  });

  // Add blank lines before major blocks (only at the top level, not indented)
  const lines = yamlStr.split('\n');
  const result: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Check if this is a top-level key (no leading whitespace) that should have a blank line
    if (i > 0 && !line.startsWith(' ') && !line.startsWith('\t')) {
      const key = line.split(':')[0];
      if (BLOCK_KEYS.includes(key)) {
        // Add blank line before this block (if previous line isn't already blank)
        if (result.length > 0 && result[result.length - 1].trim() !== '') {
          result.push('');
        }
      }
    }
    result.push(line);
  }

  return result.join('\n');
};

export const parseYml = (ymlString: string): any => {
  return YAML.parse(ymlString);
};
