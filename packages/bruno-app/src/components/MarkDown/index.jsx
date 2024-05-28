import MarkdownIt from 'markdown-it';
import * as MarkdownItReplaceLink from 'markdown-it-replace-link';
import StyledWrapper from './StyledWrapper';
import * as React from 'react';

const Markdown = ({ collectionPath, onDoubleClick, content }) => {
  const markdownItOptions = {
    replaceLink: function (link, env) {
      return link.replace(/^\./, collectionPath);
    }
  };
  const md = new MarkdownIt(markdownItOptions).use(MarkdownItReplaceLink);
  const handleOnDoubleClick = (event) => {
    if (event?.detail === 2) {
      onDoubleClick();
    }
  };
  const htmlFromMarkdown = md.render(content || '');

  return (
    <StyledWrapper>
      <div
        className="markdown-body"
        dangerouslySetInnerHTML={{ __html: htmlFromMarkdown }}
        onClick={handleOnDoubleClick}
      />
    </StyledWrapper>
  );
};

export default Markdown;
