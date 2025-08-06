import MarkdownIt from 'markdown-it';
import * as MarkdownItReplaceLink from 'markdown-it-replace-link';
import StyledWrapper from './StyledWrapper';
import React, { useEffect, useRef } from 'react';
import { isValidUrl } from 'utils/url/index';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import { IconCopy } from '@tabler/icons';
import { createRoot } from 'react-dom/client';

const Markdown = ({ collectionPath, onDoubleClick, content }) => {
  const wrapperRef = useRef();

  const markdownItOptions = {
    replaceLink: function (link, env) {
      return link.replace(/^\./, collectionPath);
    }
  };

  const md = new MarkdownIt(markdownItOptions).use(MarkdownItReplaceLink);

  // Custom renderer for fenced code blocks
  md.renderer.rules.fence = function (tokens, idx, options, env, slf) {
    const token = tokens[idx];
    const code = token.content;
    const langClass = token.info ? `language-${token.info.trim()}` : '';

    return `
      <div class="code-block-wrapper" data-copy="${encodeURIComponent(code)}">
        <div class="code-copy-placeholder"></div>
        <pre><code class="${langClass}">${md.utils.escapeHtml(code)}</code></pre>
      </div>
    `;
  };

  const htmlFromMarkdown = md.render(content || '');

  useEffect(() => {
    const wrappers = wrapperRef.current?.querySelectorAll('.code-block-wrapper');
    wrappers?.forEach((el) => {
      const placeholder = el.querySelector('.code-copy-placeholder');
      const code = decodeURIComponent(el.dataset.copy || '');

      if (placeholder) {
        const button = document.createElement('div');
        button.className = 'copy-btn-react-root';

        const reactElement = (
          <div className="copy-btn-react-root">
            <CopyToClipboard text={code} onCopy={() => toast.success('Copied to clipboard!')}>
              <IconCopy size={18} strokeWidth={1.5} />
            </CopyToClipboard>
          </div>
        );

        const root = createRoot(button);
        root.render(reactElement);
        placeholder.replaceWith(button);
      }
    });
  }, [htmlFromMarkdown]);

  const handleOnClick = (event) => {
    const target = event.target;
    if (target.tagName === 'A') {
      event.preventDefault();
      const href = target.getAttribute('href');
      if (href && isValidUrl(href)) {
        window.open(href, '_blank');
        return;
      }
    }
  };

  const handleOnDoubleClick = (event) => {
    if (event.detail === 2) {
      onDoubleClick();
    }
  };

  return (
    <StyledWrapper>
      <div
        ref={wrapperRef}
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: htmlFromMarkdown }}
        onClick={handleOnClick}
        onDoubleClick={handleOnDoubleClick}
      />
    </StyledWrapper>
  );
};

export default Markdown;
