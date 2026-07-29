import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import AIAssist from 'components/AIAssist';
import RichTextEditor from 'ui/RichTextEditor';
import ModeSwitch from 'components/ModeSwitch';
import { useEditor } from '@tiptap/react';
import StyledWrapper from './StyledWrapper';

const DocsEditor = ({
  docs,
  onEdit,
  onSave,
  isEditing,
  collection,
  collectionPath,
  requestContext,
  docsContext,
  variables,
  emptyPreviewContent,
  onRequestEdit,
  initialScroll,
  onScroll
}) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);

  const lastEmittedDocsRef = useRef(null);
  const isMarkdownModeRef = useRef(isMarkdownMode);
  const isEditingRef = useRef(isEditing);

  const editor = useEditor(
    {
      extensions: RichTextEditor.extensions({ collectionPath }),
      content: docs || '',
      editable: isEditing && !isMarkdownMode,
      onUpdate: ({ editor: currentEditor, transaction }) => {
        if (isMarkdownModeRef.current) return;
        // A task checkbox stays clickable in preview (EditorTaskList's own
        // node view), but that shouldn't dirty the request — only persist
        // edits made while the docs tab is actually in edit mode.
        if (!isEditingRef.current) return;
        if (transaction && !transaction.docChanged) return;
        const markdown = currentEditor.storage.markdown.getMarkdown();
        lastEmittedDocsRef.current = markdown;
        onEdit(markdown);
      },
      editorProps: {
        handleKeyDown: (_view, event) => {
          if (event.key === 's' && (event.ctrlKey || event.metaKey)) {
            event.preventDefault();
            onSave();
            return true;
          }
          return false;
        }
      }
    },
    [collectionPath]
  );

  useEffect(() => {
    isMarkdownModeRef.current = isMarkdownMode;
  }, [isMarkdownMode]);

  useEffect(() => {
    isEditingRef.current = isEditing;
  }, [isEditing]);

  useEffect(() => {
    if (!editor) return;

    // `docs` echoing our own last edit (e.g. a table resize that leaves the
    // serialized markdown unchanged) shouldn't reset editor content — but
    // unlike a one-shot skip flag, this comparison never gets stuck, so a
    // later *external* docs change (AI Assist, file-watcher reload) still syncs.
    if (docs === lastEmittedDocsRef.current) return;

    if (isEditing && isMarkdownMode) return;

    const content = docs || (isEditing ? '' : emptyPreviewContent || '');

    if (!editor.isDestroyed) {
      editor.commands.setContent(content, false);
    }
  }, [docs, editor, isMarkdownMode, isEditing, emptyPreviewContent]);

  useEffect(() => {
    if (isEditing) {
      setIsMarkdownMode(false);
    }
  }, [isEditing]);

  return (
    <StyledWrapper className="flex flex-col gap-y-1 h-full w-full relative">
      {isEditing && (
        <div className="docs-tab-strip">
          {!isMarkdownMode && (
            <div className="docs-toolbar-slot">
              <RichTextEditor.MenuBar editor={editor} />
            </div>
          )}
          <ModeSwitch
            isMarkdownMode={isMarkdownMode}
            onToggle={() => setIsMarkdownMode((prev) => !prev)}
            className="docs-mode-switch"
          />
        </div>
      )}

      {isEditing && isMarkdownMode && (
        <div className="relative flex-1 min-h-0">
          <CodeEditor
            collection={collection}
            theme={displayedTheme}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize')}
            value={docs || ''}
            onEdit={onEdit}
            onSave={onSave}
            mode="application/text"
            initialScroll={initialScroll}
            onScroll={onScroll}
          />
          <AIAssist
            scriptType="docs"
            currentScript={docs || ''}
            requestContext={requestContext}
            docsContext={docsContext}
            variables={variables}
            onApply={onEdit}
          />
        </div>
      )}
      <section
        className={`flex flex-col flex-1 min-h-0 w-full ${isEditing && isMarkdownMode ? 'hidden' : ''}`}
        onDoubleClick={() => !isEditing && onRequestEdit && onRequestEdit()}
      >
        <RichTextEditor editor={editor} />
      </section>
    </StyledWrapper>
  );
};

export default DocsEditor;
