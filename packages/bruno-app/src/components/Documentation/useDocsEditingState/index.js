import find from 'lodash/find';
import { useDispatch, useSelector } from 'react-redux';
import { updateDocsEditing } from 'providers/ReduxStore/slices/tabs';

export const useDocsEditingState = () => {
  const dispatch = useDispatch();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const focusedTab = find(tabs, (t) => t.uid === activeTabUid);
  const isEditing = focusedTab?.docsEditing || false;

  const setEditing = (editing) => {
    dispatch(updateDocsEditing({ uid: activeTabUid, docsEditing: editing }));
  };

  return { isEditing, setEditing };
};
