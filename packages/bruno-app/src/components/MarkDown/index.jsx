import MarkdownIt from 'markdown-it';
import StyledWrapper from './StyledWrapper';
import * as React from 'react';

const md = new MarkdownIt();

const Markdown = ({ onDoubleClick, content }) => {
  const handleClick = (event) => {
    if (event.target.href) {
      event.preventDefault();
      window.open(event.target.href, '_blank');
      return;
    }

    if (event?.detail === 2) {
      onDoubleClick();
    }
  };
  const htmlFromMarkdown = md.render(content || '');

  return (
    <StyledWrapper>
      <div className="markdown-body" dangerouslySetInnerHTML={{ __html: htmlFromMarkdown }} onClick={handleClick} />
    </StyledWrapper>
  );
};

export default Markdown;
