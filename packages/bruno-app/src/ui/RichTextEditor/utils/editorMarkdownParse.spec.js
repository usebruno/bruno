import { normalizeTaskListMarkdown } from './editorMarkdownParse';

describe('EditorMarkdownParse', () => {
  it('normalizes task list markdown', () => {
    const input = '- [x] completed\n- [ ] incomplete\n* [X] uppercase\n+ [ ] plus sign';
    const expected = '- [x] completed\n- [ ] incomplete\n* [x] uppercase\n+ [ ] plus sign';
    expect(normalizeTaskListMarkdown(input)).toBe(expected);
  });
});
