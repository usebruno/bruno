// tiptap-markdown reuses one markdown-it instance for the lifetime of an
// editor, but calls every extension's parse.setup() on every single parse —
// so a plugin registration (or renderer-rule patch) needs a guard to avoid
// re-applying itself on each keystroke.
const runMarkdownitSetupOnce = (markdownit, key, setup) => {
  if (markdownit[key]) {
    return;
  }

  setup(markdownit);
  markdownit[key] = true;
};

export default runMarkdownitSetupOnce;
