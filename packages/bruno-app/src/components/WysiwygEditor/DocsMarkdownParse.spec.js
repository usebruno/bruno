import { normalizeTaskListMarkdown } from './DocsMarkdownParse';

describe('DocsMarkdownParse', () => {
  it('normalizes task list markdown', () => {
    const input = '- [x] completed\n- [ ] incomplete\n* [X] uppercase\n+ [ ] plus sign';
    const expected = '- [x] completed\n- [ ] incomplete\n* [x] uppercase\n+ [ ] plus sign';
    expect(normalizeTaskListMarkdown(input)).toBe(expected);
  });
});
