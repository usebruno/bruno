import React, { useEffect } from 'react';
import { useEditor } from '@tiptap/react';
import RichTextEditor from 'ui/RichTextEditor';

const Markdown = ({ onDoubleClick, content, allowHtml = true, collectionPath = '', hideLinkPopover = false }) => {
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

  const handleOnDoubleClick = (event) => {
    if (event.detail === 2 && onDoubleClick) {
      onDoubleClick();
    }
  };

  return (
    <div className="h-full w-full" onDoubleClick={handleOnDoubleClick}>
      <RichTextEditor editor={editor} hideLinkPopover={hideLinkPopover} />
    </div>
  );
};

export default Markdown;
