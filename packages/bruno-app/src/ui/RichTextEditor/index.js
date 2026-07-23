import { EditorContent } from '@tiptap/react';
import { useRef } from 'react';
import EditorToolbar from './components/EditorToolbar';
import EditorLinkPopover from './components/EditorLinkPopover';
import useLinkHandlers from './utils/useLinkHandlers';
import extensions from './extensions';
import StyledWrapper from './components/StyledWrapper';

const RichTextEditor = ({ editor, showToolbar = false }) => {
  const contentContainerRef = useRef(null);
  const { handleLinkSubmit, handleUnlink } = useLinkHandlers(editor);

  return (
    <StyledWrapper className="flex flex-col h-full min-h-0">
      {showToolbar && <EditorToolbar editor={editor} />}
      <div className="rich-text-editor-content" ref={contentContainerRef}>
        <EditorContent editor={editor} className="w-full h-full" />
        <EditorLinkPopover
          editor={editor}
          containerEl={contentContainerRef.current}
          onSubmit={handleLinkSubmit}
          onUnlink={handleUnlink}
        />
      </div>
    </StyledWrapper>
  );
};

RichTextEditor.extensions = extensions;
RichTextEditor.MenuBar = EditorToolbar;

export default RichTextEditor;
