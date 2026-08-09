import get from 'lodash/get';
import { useTheme } from 'providers/Theme';
import { useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import CodeEditor from 'components/CodeEditor';
import AIAssist from 'components/AIAssist';
import RichTextEditor from 'ui/RichTextEditor';
import ModeSwitch from 'components/ModeSwitch';
import { useEditor } from '@tiptap/react';
import { useTrackScroll } from 'hooks/useTrackScroll';
import StyledWrapper from './StyledWrapper';

// Distinct from any real `docs` value (including `null`, which a fresh
// collection's docs field legitimately holds) so the "no edit emitted yet"
// sentinel below can never be mistaken for actual doc content.
const DOCS_NOT_YET_EMITTED = Symbol('docs-not-yet-emitted');

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
  onScroll,
  testId
}) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  // Entering edit mode always lands on the WYSIWYG editor by default (per
  // spec), computed during render instead of via an effect so it takes
  // effect in the same render as the isEditing change.
  const [wasEditing, setWasEditing] = useState(isEditing);
  if (isEditing !== wasEditing) {
    setWasEditing(isEditing);
    if (isEditing && !wasEditing) {
      setIsMarkdownMode(false);
    }
  }

  const lastEmittedDocsRef = useRef(DOCS_NOT_YET_EMITTED);
  const isMarkdownModeRef = useRef(isMarkdownMode);
  const isEditingRef = useRef(isEditing);
  // Plain assignment during render — these refs exist only so the onUpdate
  // closure below can read the latest mode/editing flags without being
  // recreated on every change; there's no external system to synchronize
  // with, so an effect would just add an unnecessary extra render pass.
  isMarkdownModeRef.current = isMarkdownMode;
  isEditingRef.current = isEditing;

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
      },
      onCreate: ({ editor: createdEditor }) => {
        // by default Mousetrap ignores key events that originates from contenteditable elements (like TipTap's editor),
        // adding mousetrap class to the editor's dom element will make Mousetrap listen to key events from TipTap's editor
        createdEditor.view.dom.classList.add('mousetrap');

        // Prevent keydown events which are bind to TipTap from bubbling up to the global Mousetrap handlers
        createdEditor.view.dom.addEventListener('keydown', (event) => {
          if (event.defaultPrevented) {
            event.stopPropagation();
          }
        });
      }
    },
    [collectionPath]
  );

  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const nextEditable = isEditing && !isMarkdownMode;
    if (editor.isEditable !== nextEditable) {
      editor.setEditable(nextEditable, false);
    }
  }, [editor, isEditing, isMarkdownMode]);

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

  // The rich-text view (preview AND WYSIWYG edit mode) stays mounted the
  // whole time — only markdown mode swaps it out for CodeEditor below. So
  // scroll tracking here should only pause when markdown mode's CodeEditor
  // (which has its own initialScroll/onScroll) is the one actually visible;
  // gating on `isEditing` alone left WYSIWYG edit mode with no tracking at all.
  const richTextWrapperRef = useRef(null);
  useTrackScroll({
    ref: richTextWrapperRef,
    selector: '.rich-text-editor-content',
    onChange: onScroll || (() => {}),
    enabled: !(isEditing && isMarkdownMode),
    initialValue: initialScroll
  });

  return (
    <StyledWrapper className="flex flex-col gap-y-1 h-full w-full relative" data-testid={testId}>
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
            mode="gfm"
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
        ref={richTextWrapperRef}
        className={`flex flex-col flex-1 min-h-0 w-full ${isEditing && isMarkdownMode ? 'hidden' : ''}`}
        onDoubleClick={() => !isEditing && onRequestEdit && onRequestEdit()}
      >
        <RichTextEditor editor={editor} />
      </section>
    </StyledWrapper>
  );
};

export default DocsEditor;
