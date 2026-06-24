import MarkdownIt from 'markdown-it';

const SAFE_LANG = /^[a-z0-9_+#.-]+$/i;
const safeLanguage = (lang) => (lang && SAFE_LANG.test(lang) ? lang : 'text');

const md = new MarkdownIt({
  html: false,
  breaks: true,
  linkify: true,
  highlight: (str, lang) =>
    `<pre class="code-block"><code class="language-${safeLanguage(lang)}">${md.utils.escapeHtml(str)}</code></pre>`
});

export const renderMarkdown = (content) => md.render(content || '');

export const parseMessageSegments = (content = '') => {
  if (!content) return [];

  const segments = [];
  let cursor = 0;
  let inCode = false;
  let language = '';

  while (cursor <= content.length) {
    const fenceIndex = content.indexOf('```', cursor);

    if (fenceIndex === -1) {
      const chunk = content.slice(cursor);
      if (inCode || chunk) {
        segments.push({
          type: inCode ? 'code' : 'text',
          content: chunk,
          language,
          isOpen: inCode
        });
      }
      break;
    }

    if (!inCode) {
      const textChunk = content.slice(cursor, fenceIndex);
      if (textChunk) {
        segments.push({ type: 'text', content: textChunk });
      }
      const fenceEnd = fenceIndex + 3;
      const lineEnd = content.indexOf('\n', fenceEnd);
      language = (lineEnd === -1 ? content.slice(fenceEnd) : content.slice(fenceEnd, lineEnd)).trim();
      inCode = true;
      cursor = lineEnd === -1 ? content.length : lineEnd + 1;
    } else {
      const codeChunk = content.slice(cursor, fenceIndex);
      if (codeChunk.trim()) {
        segments.push({ type: 'code', content: codeChunk, language, isOpen: false });
      }
      inCode = false;
      language = '';
      cursor = fenceIndex + 3;
      if (content[cursor] === '\n') cursor += 1;
    }
  }

  return segments.filter((seg) => seg.content && seg.content.trim());
};
