import { EditorContent } from '@tiptap/react';
import DocsToolbar from './DocsToolbar';
import extensions from './extensions';
import StyledWrapper from './StyledWrapper';

const WysiwygEditor = ({ editor, showToolbar = false }) => {
  return (
    <StyledWrapper className="flex flex-col h-full min-h-0">
      {showToolbar && <DocsToolbar editor={editor} />}
      <div className="wysiwyg-editor-content">
        <EditorContent editor={editor} className="w-full h-full" />
      </div>
    </StyledWrapper>
  );
};

WysiwygEditor.extensions = extensions;
WysiwygEditor.MenuBar = DocsToolbar;

export default WysiwygEditor;
