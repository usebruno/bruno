import { createHash } from 'node:crypto';
import { outdentString } from '@usebruno/lang';

export interface RedactedBlock {
  token: string;
  value: string;
}

export interface RedactionResult {
  skeleton: string;
  blocks: RedactedBlock[];
}

const BLOCK_TAGS = [
  'body:graphql:vars',
  'body:graphql',
  'body:json',
  'body:text',
  'body:xml',
  'body:sparql',
  'script:pre-request',
  'script:post-response',
  'tests',
  'docs',
  'body'
];

const BLOCK_OPENING = new RegExp(`^(${BLOCK_TAGS.join('|')})[ \\t]*\\{\\r?$`);

const isOpening = (line: string): boolean => BLOCK_OPENING.test(line);

// A top-level block's closing brace sits at column 0; braces inside the content are indented, so
// nested braces are correctly treated as content rather than ending the block early.
const isClosing = (line: string): boolean => line.startsWith('}');

const tokenFor = (content: string): string => {
  const hash = createHash('sha256').update(content).digest('hex').slice(0, 16);
  return `__BRU_REDACTED_TEXT_BLOCK_${hash}__`;
};

const blockValue = (content: string[]): string =>
  outdentString(content.join('\n').replace(/^(?:\r?\n)+/, '').replace(/\r$/, ''));

export const redactLargeBruTextBlocks = (content: string): RedactionResult => {
  const source = content || '';
  const skeleton: string[] = [];
  const blocks: RedactedBlock[] = [];

  let openTag: string | null = null;
  let openContent: string[] = [];

  for (const line of source.split('\n')) {
    if (openTag === null && isOpening(line)) {
      openTag = line;
      openContent = [];
      continue;
    }

    if (openTag !== null && isClosing(line)) {
      const token = tokenFor(openContent.join('\n'));
      blocks.push({ token, value: blockValue(openContent) });
      skeleton.push(openTag, `  ${token}`, line);
      openTag = null;
      continue;
    }

    (openTag === null ? skeleton : openContent).push(line);
  }

  if (openTag !== null) {
    skeleton.push(openTag, ...openContent);
  }

  if (blocks.some((block) => source.includes(block.token))) {
    console.warn('[bruno-filestore] Token collision detected; skipping redaction');
    return { skeleton: source, blocks: [] };
  }

  return { skeleton: skeleton.join('\n'), blocks };
};

export const restoreRedactedBlocks = <T>(parsed: T, blocks: RedactedBlock[]): T => {
  if (!blocks.length) {
    return parsed;
  }

  const valueByToken = new Map(blocks.map((block) => [block.token, block.value]));

  const walk = (node: any): any => {
    if (typeof node === 'string') {
      return valueByToken.get(node) ?? node;
    }
    if (node && typeof node === 'object') {
      for (const key of Object.keys(node)) {
        node[key] = walk(node[key]);
      }
    }
    return node;
  };

  return walk(parsed);
};
