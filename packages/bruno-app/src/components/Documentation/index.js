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
import WysiwygEditor from 'components/WysiwygEditor/index';
import { IconMarkdown, IconFileDescription } from '@tabler/icons';
import { Tooltip } from 'react-tooltip';
import ModeSwitch from 'components/ModeSwitch/index';
import { useEditor } from '@tiptap/react';
import { DOCS_TOOLBAR_TOOLTIP_PROPS } from 'components/WysiwygEditor/docsToolbarUi';

const Documentation = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const isEditing = focusedTab?.docsEditing || false;
  const [isMarkdownMode, setIsMarkdownMode] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const docs = item?.draft ? get(item, 'draft.request.docs') : get(item, 'request.docs');
  const preferences = useSelector((state) => state.app.preferences);

  const wrapperRef = useRef(null);
  const skipDocsSyncRef = useRef(false);
  const prevMarkdownModeRef = useRef(isMarkdownMode);
  const isMarkdownModeRef = useRef(isMarkdownMode);
  const [scroll, setScroll] = usePersistedState({ key: `request-docs-scroll-${item?.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, onChange: setScroll, enabled: !isEditing, initialValue: scroll });

  useEffect(() => {
    const el = wrapperRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;

    const observer = new ResizeObserver(() => {
      setIsCompact(el.offsetWidth < 450);
    });

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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

  const editor = useEditor({
    extensions: WysiwygEditor.extensions,
    content: docs || '',
    onUpdate: ({ editor: currentEditor, transaction }) => {
      if (isMarkdownModeRef.current) return;
      if (transaction && !transaction.docChanged) return;
      skipDocsSyncRef.current = true;
      onEdit(currentEditor.storage.markdown.getMarkdown());
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
  });

  const { requestContext, variables: aiVariables } = useMemo(
    () => (item ? buildAiContextPayload(item, collection) : { requestContext: null, variables: [] }),
    [item, collection]
  );

  useEffect(() => {
    isMarkdownModeRef.current = isMarkdownMode;
  }, [isMarkdownMode]);

  useEffect(() => {
    if (editor) {
      editor.setEditable(isEditing && !isMarkdownMode);
    }
  }, [editor, isEditing, isMarkdownMode]);

  useEffect(() => {
    if (!editor) return;

    if (skipDocsSyncRef.current) {
      skipDocsSyncRef.current = false;
      return;
    }

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

  const getTabClassname = (tabName) => {
    const isActive = (tabName === 'Edit' && isEditing) || (tabName === 'Preview' && !isEditing);
    return `docs-tab ${isActive ? 'is-active' : ''}`;
  };

  if (!item) {
    return null;
  }

  return (
    <StyledWrapper className="flex flex-col gap-y-1 h-full w-full relative" ref={wrapperRef}>
      <div className="docs-tab-strip">
        {isEditing && !isMarkdownMode && (
          <div className="docs-toolbar-slot">
            <WysiwygEditor.MenuBar editor={editor} />
          </div>
        )}

        {isEditing && (
          <ModeSwitch
            compact={isCompact}
            checked={isMarkdownMode}
            onChange={() => setIsMarkdownMode((prev) => !prev)}
            rightComponent={(
              <IconMarkdown
                id="markdown-mode"
                className="focus:outline-none"
                size={18}
                strokeWidth={1.5}
                data-tooltip-id="docs-mode-tooltip"
                data-tooltip-content="Markdown mode"
              />
            )}
            leftComponent={(
              <IconFileDescription
                id="wysiwyg-mode"
                className="focus:outline-none"
                size={18}
                strokeWidth={1.5}
                data-tooltip-id="docs-mode-tooltip"
                data-tooltip-content="WYSIWYG mode"
              />
            )}
            className="docs-mode-switch"
          />
        )}
        <Tooltip id="docs-mode-tooltip" {...DOCS_TOOLBAR_TOOLTIP_PROPS} />
      </div>

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
        <WysiwygEditor editor={editor} />
      </section>
    </StyledWrapper>
  );
};

export default Documentation;
