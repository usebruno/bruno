import 'github-markdown-css/github-markdown.css';
import get from 'lodash/get';
import find from 'lodash/find';
import { updateRequestDocs } from 'providers/ReduxStore/slices/collections';
import { updateDocsEditing } from 'providers/ReduxStore/slices/tabs';
import { useTheme } from 'providers/Theme';
import { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import Markdown from 'components/MarkDown';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';

const Documentation = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const isEditing = focusedTab?.docsEditing || false;
  const docs = item.draft ? get(item, 'draft.request.docs') : get(item, 'request.docs');
  const preferences = useSelector((state) => state.app.preferences);

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
    <StyledWrapper className="flex flex-col gap-y-1 h-full w-full relative">
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
        />
      ) : (
        <Markdown collectionPath={collection.pathname} onDoubleClick={toggleViewMode} content={docs} />
      )}
    </StyledWrapper>
  );
};

export default Documentation;
