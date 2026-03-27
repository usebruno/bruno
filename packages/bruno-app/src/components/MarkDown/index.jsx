import MarkdownIt from 'markdown-it';
import * as MarkdownItReplaceLink from 'markdown-it-replace-link';
import StyledWrapper from './StyledWrapper';
import React from 'react';
import { isValidUrl } from 'utils/url/index';
import DOMPurify from 'dompurify';
import { useMemo } from 'react';

const Markdown = ({ collectionPath, onDoubleClick, content }) => {
  const markdownItOptions = {
    html: true,
    breaks: true,
    linkify: true,
    replaceLink: function (link, env) {
      return link.replace(/^\./, collectionPath);
    }
  };

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

  const md = new MarkdownIt(markdownItOptions).use(MarkdownItReplaceLink);
  const htmlFromMarkdown = useMemo(() => md.render(content || ''), [content, collectionPath]);
  const cleanHTML = useMemo(() => DOMPurify.sanitize(htmlFromMarkdown), [htmlFromMarkdown]);

  return (
    <StyledWrapper>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: cleanHTML }}
        onClick={handleOnClick}
        onDoubleClick={handleOnDoubleClick}
      />
    </StyledWrapper>
  );
};

export default Markdown;
