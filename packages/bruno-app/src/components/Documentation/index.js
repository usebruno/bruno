import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import find from 'lodash/find';
import { updateRequestDocs } from 'providers/ReduxStore/slices/collections';
import { updateDocsEditing } from 'providers/ReduxStore/slices/tabs';
import { useTheme } from 'providers/Theme';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import CodeEditor from 'components/CodeEditor';
import AIAssist from 'components/AIAssist';
import { buildAiContextPayload } from 'utils/ai';
import StyledWrapper from './StyledWrapper';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';
import RichTextEditor from 'ui/RichTextEditor';
import ModeSwitch from 'components/ModeSwitch';
import { useEditor } from '@tiptap/react';

const Documentation = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const isEditing = focusedTab?.docsEditing || false;
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const docs = item?.draft ? get(item, 'draft.request.docs') : get(item, 'request.docs');
  const preferences = useSelector((state) => state.app.preferences);

  const wrapperRef = useRef(null);
  const lastEmittedDocsRef = useRef(null);
  const isMarkdownModeRef = useRef(isMarkdownMode);
  const isEditingRef = useRef(isEditing);
  const [scroll, setScroll] = usePersistedState({ key: `request-docs-scroll-${item?.uid}`, default: 0 });
  useTrackScroll({
    ref: wrapperRef,
    selector: '.rich-text-editor-content',
    onChange: setScroll,
    enabled: !isEditing,
    initialValue: scroll
  });

  const onEdit = useCallback(
    (value) => {
      if (!item) return;
      dispatch(
        updateRequestDocs({
          itemUid: item.uid,
          collectionUid: collection.uid,
          docs: value
        })
      );
    },
    [collection.uid, dispatch, item]
  );

  const onSave = useCallback(() => {
    if (!item) return;
    dispatch(saveRequest(item.uid, collection.uid));
  }, [collection.uid, dispatch, item]);

  const editor = useEditor(
    {
      extensions: RichTextEditor.extensions({ collectionPath: collection?.pathname }),
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
    [collection?.pathname]
  );

  const { requestContext, variables: aiVariables } = useMemo(
    () => (item ? buildAiContextPayload(item, collection) : { requestContext: null, variables: [] }),
    [item, collection]
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

    if (!editor.isDestroyed) {
      editor.commands.setContent(docs || '', false);
    }
  }, [docs, editor, isMarkdownMode, isEditing]);

  useEffect(() => {
    if (isEditing) {
      setIsMarkdownMode(false);
    }
  }, [isEditing]);

  const setEditing = (editing) => {
    dispatch(updateDocsEditing({ uid: activeTabUid, docsEditing: editing }));
  };

  if (!item) {
    return null;
  }

  return (
    <StyledWrapper className="flex flex-col gap-y-1 h-full w-full relative" ref={wrapperRef}>
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
            initialScroll={scroll}
            onScroll={setScroll}
          />
          <AIAssist
            scriptType="docs"
            currentScript={docs || ''}
            requestContext={requestContext}
            variables={aiVariables}
            onApply={onEdit}
          />
        </div>
      )}
      <section
        className={`flex flex-col flex-1 min-h-0 w-full ${isEditing && isMarkdownMode ? 'hidden' : ''}`}
        onDoubleClick={() => !isEditing && setEditing(true)}
      >
        <RichTextEditor editor={editor} />
      </section>
    </StyledWrapper>
  );
};

export default Documentation;
