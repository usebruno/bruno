import MarkdownIt from 'markdown-it';
import StyledWrapper from './StyledWrapper';

const md = new MarkdownIt();

const Markdown = ({ onDoubleClick, content }) => {
  const handleOnDoubleClick = (event) => {
    switch (event.detail) {
      case 2: {
        onDoubleClick();
        break;
      }
      case 1:
      default: {
        break;
      }
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
