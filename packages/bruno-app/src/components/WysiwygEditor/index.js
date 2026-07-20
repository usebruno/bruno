import { EditorContent } from '@tiptap/react';
import { useRef } from 'react';
import DocsToolbar from './DocsToolbar';
import DocsLinkPopover from './DocsLinkPopover';
import useLinkHandlers from './useLinkHandlers';
import extensions from './extensions';
import StyledWrapper from './StyledWrapper';

const WysiwygEditor = ({ editor, showToolbar = false }) => {
  const contentContainerRef = useRef(null);
  const { handleLinkSubmit, handleUnlink } = useLinkHandlers(editor);

  return (
    <StyledWrapper className="flex flex-col h-full min-h-0">
      {showToolbar && <DocsToolbar editor={editor} />}
      <div className="wysiwyg-editor-content" ref={contentContainerRef}>
        <EditorContent editor={editor} className="w-full h-full" />
        <DocsLinkPopover
          editor={editor}
          containerEl={contentContainerRef.current}
          onSubmit={handleLinkSubmit}
          onUnlink={handleUnlink}
        />
      </div>
    </StyledWrapper>
  );
};

WysiwygEditor.extensions = extensions;
WysiwygEditor.MenuBar = DocsToolbar;

export default WysiwygEditor;
