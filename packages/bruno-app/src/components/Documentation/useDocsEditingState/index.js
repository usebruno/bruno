import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import { updateDocsEditing, updateDocsMarkdownMode } from 'providers/ReduxStore/slices/tabs';

export const useDocsEditingState = () => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const isEditing = focusedTab?.docsEditing || false;
  const isMarkdownMode = focusedTab?.docsMarkdownMode || false;

  const setEditing = (editing) => {
    dispatch(updateDocsEditing({ uid: activeTabUid, docsEditing: editing }));
  };

  const setMarkdownMode = (markdownMode) => {
    dispatch(updateDocsMarkdownMode({ uid: activeTabUid, docsMarkdownMode: markdownMode }));
  };

  return { isEditing, setEditing, isMarkdownMode, setMarkdownMode };
};
