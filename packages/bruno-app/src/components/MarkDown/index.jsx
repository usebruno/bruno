import React, { useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import RichTextEditor from 'ui/RichTextEditor';
import { isSafeUrl } from 'utils/url/index';

const Markdown = ({ onDoubleClick, content, allowHtml = true, collectionPath = '' }) => {
  const editor = useEditor(
    {
      extensions: RichTextEditor.extensions({ allowHtml, collectionPath }),
      content: content || '',
      editable: false
    },
    [allowHtml, collectionPath]
  );

  useEffect(() => {
    if (editor) {
      editor.commands.setContent(content || '', false);
    }
  }, [content, editor]);

  const handleOnClick = (event) => {
    const target = event.target.closest('a');
    if (!target) return;

    const href = target.getAttribute('href');
    // Always prevent the anchor's default navigation — falling through to it
    // for a link that fails the safety check would navigate the renderer itself.
    event.preventDefault();

    if (href && isSafeUrl(href)) {
      window.open(href, '_blank', 'noopener,noreferrer');
    }
  };

  const handleOnDoubleClick = (event) => {
    if (event.detail === 2 && onDoubleClick) {
      onDoubleClick();
    }
  };

  return (
    <div className="h-full w-full" onDoubleClick={handleOnDoubleClick} onClick={handleOnClick}>
      <RichTextEditor editor={editor} />
    </div>
  );
};

export default Markdown;
