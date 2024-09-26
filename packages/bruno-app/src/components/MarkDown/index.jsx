import MarkdownIt from 'markdown-it';
import * as MarkdownItReplaceLink from 'markdown-it-replace-link';
import StyledWrapper from './StyledWrapper';
import React from 'react';
import { isValidUrl } from 'utils/url/index';

const Markdown = ({ collectionPath, onDoubleClick, content }) => {
  const markdownItOptions = {
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

  const htmlFromMarkdown = md.render(content || '');

  return (
    <StyledWrapper>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: htmlFromMarkdown }}
        onClick={handleOnClick}
        onDoubleClick={handleOnDoubleClick}
      />
    </StyledWrapper>
  );
};

export default Markdown;
