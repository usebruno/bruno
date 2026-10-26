import * as acorn from 'acorn';

/**
 * Removes `//` and `/* *\/` comments from a JSON request body or GraphQL variables
 * before they are sent, so users can annotate bodies even though JSON forbids comments.
 *
 * The body is tokenised as JavaScript rather than JSON on purpose: Bruno bodies may hold
 * single-quoted strings, template-style `{{variables}}` and partially typed content, and
 * a JSON-only scanner would mistake a `//` inside a single-quoted URL for a comment.
 * Tokenising (not parsing) keeps unknown tokens such as `{{var}}` intact.
 *
 * Throws on input acorn cannot tokenise (an unterminated string or comment); callers
 * fall back to sending the body untouched.
 */
export const stripComments = (source: string): string => {
  const comments: acorn.Comment[] = [];
  const tokenizer = acorn.tokenizer(source, { ecmaVersion: 'latest', onComment: comments });
  while (tokenizer.getToken().type.label !== 'eof') {
    // getToken() advances through the source and records every comment it passes
  }

  let stripped = '';
  let cursor = 0;
  for (const { start, end } of comments) {
    stripped += source.slice(cursor, start);
    cursor = end;
  }
  return stripped + source.slice(cursor);
};
