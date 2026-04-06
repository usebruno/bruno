import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import find from 'lodash/find';
import { updateRequestDocs } from 'providers/ReduxStore/slices/collections';
import { updateDocsEditing } from 'providers/ReduxStore/slices/tabs';
import { useTheme } from 'providers/Theme';
import { useRef } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import Markdown from 'components/MarkDown';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';
import { usePersistedContainerScroll } from 'hooks/usePersistedState/usePersistedContainerScroll';

const Documentation = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const isEditing = focusedTab?.docsEditing || false;
  const docs = item.draft ? get(item, 'draft.request.docs') : get(item, 'request.docs');
  const preferences = useSelector((state) => state.app.preferences);

  // Scroll persistence for both edit (CodeMirror) and preview (Markdown) modes using one shared key.
  // Preview mode: hook tracks .flex-boundary scroll (enabled only when not editing).
  // Edit mode: CodeEditor's onScroll/initialScroll props write/read the same localStorage key.
  const wrapperRef = useRef(null);
  // Pass null selector — wrapperRef itself is the scrollable container (has overflow-y: auto)
  const storageKey = usePersistedContainerScroll(wrapperRef, null, `request-docs-scroll-${item.uid}`, !isEditing);

  const readScroll = () => {
    try {
      const raw = localStorage.getItem(storageKey);
      return raw !== null ? JSON.parse(raw) || 0 : 0;
    } catch { return 0; }
  };

  const toggleViewMode = () => {
    dispatch(updateDocsEditing({ uid: activeTabUid, docsEditing: !isEditing }));
  };

  const onEdit = (value) => {
    dispatch(
      updateRequestDocs({
        itemUid: item.uid,
        collectionUid: collection.uid,
        docs: value
      })
    );
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));

  if (!item) {
    return null;
  }

  return (
    <StyledWrapper className="flex flex-col gap-y-1 h-full w-full relative" ref={wrapperRef}>
      <div className="editing-mode" role="tab" onClick={toggleViewMode}>
        {isEditing ? 'Preview' : 'Edit'}
      </div>

      {isEditing ? (
        <CodeEditor
          collection={collection}
          theme={displayedTheme}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          value={docs || ''}
          onEdit={onEdit}
          onSave={onSave}
          mode="application/text"
          initialScroll={readScroll()}
          onScroll={(editor) => localStorage.setItem(storageKey, JSON.stringify(editor.doc.scrollTop))}
        />
      ) : (
        <Markdown collectionPath={collection.pathname} onDoubleClick={toggleViewMode} content={docs} />
      )}
    </StyledWrapper>
  );
};

export default Documentation;
