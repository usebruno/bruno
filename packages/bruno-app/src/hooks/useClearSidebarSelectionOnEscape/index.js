import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { clearSidebarSelection } from 'providers/ReduxStore/slices/collections';

const useClearSidebarSelectionOnEscape = () => {
  const dispatch = useDispatch();
  const selectedSidebarUids = useSelector((state) => state.collections.selectedSidebarUids);

  useEffect(() => {
    if (!selectedSidebarUids || selectedSidebarUids.length === 0) return;

    const handleEscape = (e) => {
      if (e.key === 'Escape' && !e.defaultPrevented) {
        dispatch(clearSidebarSelection());
      }
    };
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [dispatch, selectedSidebarUids]);
};

export default useClearSidebarSelectionOnEscape;
