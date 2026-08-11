import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dropdown from 'components/Dropdown';
import { IconX, IconFoldDown, IconFoldUp, IconTrash } from '@tabler/icons';
import { collapseCollection, collapseItem, expandCollection, expandItem, clearSidebarSelection } from 'providers/ReduxStore/slices/collections';
import { getOtherCollections, getSelectionInfo } from 'utils/collections/index';
import { mountCollection } from 'providers/ReduxStore/slices/collections/actions';

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
  const hasOtherCollections = otherCollections.length > 0;
  const allOthersCollapsed = hasOtherCollections && otherCollections.every((c) => c.collapsed);

  const clearAndClose = () => {
    dispatch(clearSidebarSelection());
    onClose();
  };

  const handleCloseCollections = () => {
    onRequestRemoveCollections(effectiveSelection.map((entry) => entry.uid));
    onClose();
  };

  const handleCloseOthers = () => {
    onRequestRemoveCollections(otherCollections.map((c) => c.uid));
    onClose();
  };

  const handleToggleCollapse = async () => {
    const targetCollapsed = !allCollapsed;

    // If we are expanding, ensure all selected collections are mounted first
    if (!targetCollapsed) {
      const collectionsToMount = collapsibleEntries.filter(
        (entry) => entry.type === 'collection' && entry.collection.mountStatus !== 'mounted' && entry.collection.mountStatus !== 'mounting'
      );

      await Promise.all(collectionsToMount.map((entry) =>
        dispatch(mountCollection({
          collectionUid: entry.uid,
          collectionPathname: entry.collection.pathname,
          brunoConfig: entry.collection.brunoConfig
        }))
      ));
    }

    collapsibleEntries.forEach((entry) => {
      if (isEntryCollapsed(entry) === targetCollapsed) return;

      if (entry.type === 'collection') {
        dispatch(allCollapsed ? expandCollection(entry.uid) : collapseCollection(entry.uid));
      } else {
        dispatch(
          allCollapsed
            ? expandItem({ collectionUid: entry.collectionUid, itemUid: entry.uid })
            : collapseItem({ collectionUid: entry.collectionUid, itemUid: entry.uid })
        );
      }
    });
    clearAndClose();
  };

  const handleToggleCollapseOthers = async () => {
    const targetCollapsed = !allOthersCollapsed;

    // If we are expanding others, ensure all other collections are mounted first
    if (!targetCollapsed) {
      const collectionsToMount = otherCollections.filter(
        (c) => c.mountStatus !== 'mounted' && c.mountStatus !== 'mounting'
      );

      await Promise.all(collectionsToMount.map((c) =>
        dispatch(mountCollection({
          collectionUid: c.uid,
          collectionPathname: c.pathname,
          brunoConfig: c.brunoConfig
        }))
      ));
    }

    otherCollections.forEach((collection) => {
      if (collection.collapsed === targetCollapsed) return;
      dispatch(targetCollapsed ? collapseCollection(collection.uid) : expandCollection(collection.uid));
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
          {hasOtherCollections ? (
            <>
              <div className="dropdown-item delete-collection" onClick={handleCloseOthers}>
                <IconX size={16} strokeWidth={2} className="dropdown-icon" />
                Remove Others
              </div>
              <div className="dropdown-item" onClick={handleToggleCollapseOthers}>
                <CollapseOthersIcon size={16} strokeWidth={2} className="dropdown-icon" />
                {collapseOthersLabel}
              </div>
            </>
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
