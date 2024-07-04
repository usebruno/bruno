import MarkdownIt from 'markdown-it';
import StyledWrapper from './StyledWrapper';
import React, { useCallback } from 'react';

const md = new MarkdownIt();

const Markdown = ({ onDoubleClick, content }) => {
  const handleOnClick = useCallback((event) => {
    const target = event.target;
    if (target.tagName === 'A') {
      event.preventDefault();
      const href = target.getAttribute('href');
      if (href) {
        window.open(href, '_blank');
        return;
      }
    }
  }, []);

  const handleOnDoubleClick = useCallback(
    (event) => {
      if (event.detail === 2) {
        onDoubleClick();
      }
    },
    [onDoubleClick]
  );

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
