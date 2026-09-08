import { useDispatch, useSelector } from 'react-redux';
import { toggleSidebarSelection, setLastClickedSidebarUid, clearSidebarSelection } from 'providers/ReduxStore/slices/collections';
import { selectSidebarRange } from 'providers/ReduxStore/slices/collections/actions';
import { isMacOS } from 'utils/common/platform';

const isSelectionModifierPressed = (event) => (isMacOS() ? event.metaKey : event.ctrlKey);

const useSidebarSelectionClick = ({ uid, searchText }) => {
  const dispatch = useDispatch();
  const selectedSidebarUids = useSelector((state) => state.collections.selectedSidebarUids);

  return (event) => {
    if (isSelectionModifierPressed(event)) {
      event.preventDefault();
      event.stopPropagation();

      dispatch(toggleSidebarSelection(uid));
      dispatch(setLastClickedSidebarUid(uid));
      return true;
    }

    if (event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      dispatch(selectSidebarRange({ uid, searchText }));
      return true;
    }

    if (selectedSidebarUids.length > 0) {
      dispatch(clearSidebarSelection());
    }
    dispatch(setLastClickedSidebarUid(uid));
    return false;
  };
};

export default useSidebarSelectionClick;
