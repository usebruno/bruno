import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dropdown from 'components/Dropdown';
import { IconX, IconFoldDown, IconFoldUp, IconTrash } from '@tabler/icons';
import { collapseFullCollection, collapseFullItem, expandFullCollection, expandFullItem, clearSidebarSelection } from 'providers/ReduxStore/slices/collections';
import { getOtherCollections, getSelectionInfo } from 'utils/collections/index';

const isEntryCollapsed = (entry) => (entry.type === 'collection' ? entry.collection.collapsed : entry.item.collapsed);

const BulkActionsDropdown = ({ visible, onClose, position, onRequestRemoveCollections, onRequestDeleteItems }) => {
  const dispatch = useDispatch();

  const collections = useSelector((state) => state.collections.collections);
  const selectedSidebarUids = useSelector((state) => state.collections.selectedSidebarUids);

  const { effectiveSelection, hasCollection, hasFolder, hasRequest } = useMemo(
    () => getSelectionInfo({ collections, selectedUids: selectedSidebarUids }),
    [collections, selectedSidebarUids]
  );

  const isPureCollectionSelection = hasCollection && !hasFolder && !hasRequest;
  const canDelete = !hasCollection && (hasFolder || hasRequest);
  const collapsibleEntries = effectiveSelection.filter((entry) => entry.type !== 'request');
  const canCollapse = collapsibleEntries.length > 0;
  const allCollapsed = canCollapse && collapsibleEntries.every(isEntryCollapsed);

  const otherCollections = getOtherCollections(collections, effectiveSelection.map((entry) => entry.uid));
  const canCollapseOthers = otherCollections.length > 0;
  const allOthersCollapsed = canCollapseOthers && otherCollections.every((c) => c.collapsed);

  const clearAndClose = () => {
    dispatch(clearSidebarSelection());
    onClose();
  };

  const handleCloseCollections = () => {
    onRequestRemoveCollections(effectiveSelection.map((entry) => entry.uid));
    onClose();
  };

  const handleCloseOthers = () => {
    const otherUids = getOtherCollections(collections, effectiveSelection.map((entry) => entry.uid)).map((c) => c.uid);
    onRequestRemoveCollections(otherUids);
    onClose();
  };

  const handleToggleCollapse = () => {
    const targetCollapsed = !allCollapsed;
    collapsibleEntries.forEach((entry) => {
      if (isEntryCollapsed(entry) === targetCollapsed) return;

      if (entry.type === 'collection') {
        dispatch(allCollapsed ? expandFullCollection({ collectionUid: entry.uid }) : collapseFullCollection({ collectionUid: entry.uid }));
      } else {
        dispatch(
          allCollapsed
            ? expandFullItem({ collectionUid: entry.collectionUid, itemUid: entry.uid })
            : collapseFullItem({ collectionUid: entry.collectionUid, itemUid: entry.uid })
        );
      }
    });
    clearAndClose();
  };

  const handleToggleCollapseOthers = () => {
    const targetCollapsed = !allOthersCollapsed;
    otherCollections.forEach((collection) => {
      if (collection.collapsed === targetCollapsed) return;
      dispatch(targetCollapsed ? collapseFullCollection({ collectionUid: collection.uid }) : expandFullCollection({ collectionUid: collection.uid }));
    });
    clearAndClose();
  };

  const handleDelete = () => {
    onRequestDeleteItems(effectiveSelection.filter((entry) => entry.type !== 'collection'));
    onClose();
  };

  const CollapseIcon = allCollapsed ? IconFoldUp : IconFoldDown;
  const collapseLabel = allCollapsed ? 'Expand' : 'Collapse';
  const CollapseOthersIcon = allOthersCollapsed ? IconFoldUp : IconFoldDown;
  const collapseOthersLabel = allOthersCollapsed ? 'Expand Others' : 'Collapse Others';

  const anchorStyle = {
    position: 'fixed',
    left: `${position?.x || 0}px`,
    top: `${position?.y || 0}px`,
    width: '1px',
    height: '1px',
    pointerEvents: 'none'
  };

  return (
    <Dropdown
      icon={<div style={anchorStyle} />}
      placement="right-start"
      visible={visible}
      appendTo={document.body}
      onClickOutside={onClose}
    >
      {isPureCollectionSelection ? (
        <>
          <div className="dropdown-item delete-collection" onClick={handleCloseCollections}>
            <IconX size={16} strokeWidth={2} className="dropdown-icon" />
            Remove
          </div>
          <div className="dropdown-item" onClick={handleToggleCollapse}>
            <CollapseIcon size={16} strokeWidth={2} className="dropdown-icon" />
            {collapseLabel}
          </div>
          <div className="dropdown-item delete-collection" onClick={handleCloseOthers}>
            <IconX size={16} strokeWidth={2} className="dropdown-icon" />
            Remove Others
          </div>
          {canCollapseOthers ? (
            <div className="dropdown-item" onClick={handleToggleCollapseOthers}>
              <CollapseOthersIcon size={16} strokeWidth={2} className="dropdown-icon" />
              {collapseOthersLabel}
            </div>
          ) : null}
        </>
      ) : (
        <>
          {canCollapse ? (
            <div className="dropdown-item" onClick={handleToggleCollapse}>
              <CollapseIcon size={16} strokeWidth={2} className="dropdown-icon" />
              {collapseLabel}
            </div>
          ) : null}
          {canDelete ? (
            <div className="dropdown-item delete-item" onClick={handleDelete}>
              <IconTrash size={16} strokeWidth={2} className="dropdown-icon" />
              Delete
            </div>
          ) : null}
        </>
      )}
    </Dropdown>
  );
};

export default BulkActionsDropdown;
