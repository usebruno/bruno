import React, { useState } from 'react';
import { EditorContent } from '@tiptap/react';
import EditorToolbar from './components/EditorToolbar';
import EditorLinkPopover from './components/EditorLinkPopover';
import useLinkHandlers from './hooks/useLinkHandlers';
import extensions from './extensions';
import StyledWrapper from './components/StyledWrapper';

const RichTextEditor = ({ editor, hideLinkPopover = false, onLinkClick }) => {
  // A plain ref's `.current` isn't populated yet during this render, so a
  // callback ref (which re-renders once the DOM node mounts) is what lets
  // EditorLinkPopover receive the real container instead of always null.
  const [contentContainerEl, setContentContainerEl] = useState(null);
  const { handleLinkSubmit, handleUnlink } = useLinkHandlers(editor);

  return (
    <StyledWrapper className="flex flex-col h-full min-h-0">
      <div className="rich-text-editor-content" ref={setContentContainerEl}>
        <EditorContent editor={editor} className="w-full h-full" />
        {!hideLinkPopover && (
          <EditorLinkPopover
            editor={editor}
            containerEl={contentContainerEl}
            onSubmit={handleLinkSubmit}
            onUnlink={handleUnlink}
            onLinkClick={onLinkClick}
          />
        )}
      </div>
    </StyledWrapper>
  );
};

RichTextEditor.extensions = extensions;
RichTextEditor.MenuBar = EditorToolbar;

export default RichTextEditor;
