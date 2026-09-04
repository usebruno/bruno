import { useMemo } from 'react';
import { getSelectionInfo } from 'utils/collections/index';

// A multi-selection that mixes a collection with a folder/request/app has no common drop target,
// so dragging it is disabled entirely.
const useMultiSelectDragDisabled = ({ isSelected, selectedSidebarUids, allCollections }) => {
  return useMemo(() => {
    if (!isSelected || !selectedSidebarUids || selectedSidebarUids.length < 2) return false;
    const { hasCollection, hasFolder, hasRequest, hasApp } = getSelectionInfo({ collections: allCollections, selectedUids: selectedSidebarUids });
    return hasCollection && (hasFolder || hasRequest || hasApp);
  }, [isSelected, selectedSidebarUids, allCollections]);
};

export default useMultiSelectDragDisabled;
