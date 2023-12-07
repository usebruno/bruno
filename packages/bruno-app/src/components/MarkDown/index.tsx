// @ts-ignore
import MarkdownIt from 'markdown-it';
import StyledWrapper from './StyledWrapper';
import * as React from 'react';

const md = new MarkdownIt();

const Markdown = ({ onDoubleClick, content }: { onDoubleClick: () => void; content?: string }) => {
  const handleOnDoubleClick = (event: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    console.log(event);
    if (event?.detail === 2) {
      onDoubleClick();
    }
    return;
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
