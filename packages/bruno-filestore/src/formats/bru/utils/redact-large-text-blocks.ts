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
  'script:grpc:before-call-start',
  'script:grpc:before-message-send',
  'script:grpc:after-message-receive',
  'script:grpc:after-call-end',
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

const APP_BLOCK_OPENING = /^app[ \t]*\{\r?$/;
const MULTILINE_DELIMITER = '\'\'\'';
const APP_CODE_PAIR = `code: ${MULTILINE_DELIMITER}`;

const appCodeValue = (code: string[]): string =>
  code.map((line) => line.slice(4)).join('\n').trim();

const redactAppCode = (source: string, blocks: RedactedBlock[]): string => {
  const lines = source.split('\n');

  const start = lines.findIndex((line) => APP_BLOCK_OPENING.test(line));
  if (start === -1) {
    return source;
  }

  const closingBrace = lines.findIndex((line, index) => index > start && isClosing(line));
  const end = closingBrace === -1 ? lines.length : closingBrace;

  const opening = lines.findIndex((line, index) => index > start && index < end && line.trim() === APP_CODE_PAIR);
  if (opening === -1) {
    return source;
  }

  const closing = lines.findIndex(
    (line, index) => index > opening && index < end && line.trim() === MULTILINE_DELIMITER
  );
  if (closing === -1) {
    return source;
  }

  const code = lines.slice(opening + 1, closing);
  const value = appCodeValue(code);
  if (!value.length) {
    return source;
  }

  const token = tokenFor(code.join('\n'));
  blocks.push({ token, value });
  return [...lines.slice(0, opening + 1), `    ${token}`, ...lines.slice(closing)].join('\n');
};

export const redactLargeBruTextBlocks = (content: string): RedactionResult => {
  const source = content || '';
  const skeleton: string[] = [];
  const blocks: RedactedBlock[] = [];

  let openTag: string | null = null;
  let openContent: string[] = [];

  for (const line of redactAppCode(source, blocks).split('\n')) {
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
