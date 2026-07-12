import React, { useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import WysiwygEditor from 'components/WysiwygEditor/index';
import { isValidUrl } from 'utils/url/index';

const Markdown = ({ collectionPath, onDoubleClick, content, allowHtml = true }) => {
  const editor = useEditor({
    extensions: WysiwygEditor.extensions,
    content: content || '',
    editable: false
  });

  useEffect(() => {
    if (editor) {
      editor.commands.setContent(content || '', false);
    }
  }, [content, editor]);

  const handleOnClick = (event) => {
    const target = event.target.closest('a');
    if (target && target.tagName === 'A') {
      const href = target.getAttribute('href');
      if (href && isValidUrl(href)) {
        event.preventDefault();
        window.open(href, '_blank');
      }
    }
  };

  const handleOnDoubleClick = (event) => {
    if (event.detail === 2 && onDoubleClick) {
      onDoubleClick();
    }
  };

  return (
    <div className="h-full w-full markdown-wysiwyg-wrapper" onDoubleClick={handleOnDoubleClick} onClick={handleOnClick}>
      <WysiwygEditor editor={editor} />
    </div>
  );
};

export default Markdown;
