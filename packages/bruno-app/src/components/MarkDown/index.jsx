import MarkdownIt from 'markdown-it';
import * as MarkdownItReplaceLink from 'markdown-it-replace-link';
import StyledWrapper from './StyledWrapper';
import React from 'react';
import { isValidUrl } from 'utils/url/index';
import { patchLinkifyToExtendUrls } from 'utils/linkify';
import DOMPurify from 'dompurify';
import { useMemo } from 'react';

const Markdown = ({ collectionPath, onDoubleClick, content, allowHtml = true }) => {
  const md = useMemo(() => {
    const instance = new MarkdownIt({
      html: allowHtml,
      breaks: true,
      linkify: true,
      replaceLink: (link) => link.replace(/^\./, collectionPath)
    }).use(MarkdownItReplaceLink);

    return patchLinkifyToExtendUrls(instance);
  }, [allowHtml, collectionPath]);

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

  const htmlFromMarkdown = useMemo(() => md.render(content || ''), [content, collectionPath, allowHtml]);
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
