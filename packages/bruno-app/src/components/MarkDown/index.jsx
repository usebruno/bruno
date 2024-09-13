import MarkdownIt from 'markdown-it';
import * as MarkdownItReplaceLink from 'markdown-it-replace-link';
import StyledWrapper from './StyledWrapper';
import React from 'react';

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
      if (href) {
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

  const handleKeyDown = (event) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
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
        onClick={handleOnClick}
        onDoubleClick={handleOnDoubleClick}
      />
    </StyledWrapper>
  );
};

export default Markdown;
