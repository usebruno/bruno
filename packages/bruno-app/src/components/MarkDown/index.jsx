import MarkdownIt from 'markdown-it';
import StyledWrapper from './StyledWrapper';
import * as React from 'react';

const md = new MarkdownIt();

const Markdown = ({ onDoubleClick, content, onSave }) => {
  const handleOnDoubleClick = (event) => {
    if (event?.detail === 2) {
      onDoubleClick();
    }
  };
  const htmlFromMarkdown = md.render(content || '');

  const handleKeyDown = (event) => {
    const saveKeyCode = 83;
    if ((event.ctrlKey || event.metaKey) && event.keyCode === saveKeyCode) {
      event.preventDefault(); // Prevent the default browser save action
      onSave(); // Call the onSave function when Ctrl+S or Cmd+S is pressed
    }
  };

  React.useEffect(() => {
    document.addEventListener('keydown', handleKeyDown); // Add event listener for keydown
    return () => {
      document.removeEventListener('keydown', handleKeyDown); // Clean up the event listener
    };
  }, []);

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
