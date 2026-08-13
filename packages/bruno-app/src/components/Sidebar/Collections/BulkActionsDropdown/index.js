import React, { useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import Dropdown from 'components/Dropdown';
import { IconX, IconFoldDown, IconFoldUp, IconTrash } from '@tabler/icons';
import { collapseCollection, collapseItem, expandCollection, expandItem, clearSidebarSelection } from 'providers/ReduxStore/slices/collections';
import toast from 'react-hot-toast';
import { getOtherCollections, getSelectionInfo, isScratchCollection } from 'utils/collections/index';
import { mountCollection } from 'providers/ReduxStore/slices/collections/actions';

const isEntryCollapsed = (entry) => (entry.type === 'collection' ? entry.collection.collapsed : entry.item.collapsed);

const BulkActionsDropdown = ({ visible, onClose, position, onRequestRemoveCollections, onRequestDeleteItems }) => {
  const dispatch = useDispatch();

  const selectedSidebarUids = useSelector((state) => state.collections.selectedSidebarUids);
  const collections = useSelector((state) => state.collections.collections);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  // This will filter out the scratch collections from the list
  const visibleCollections = collections.filter((c) => !isScratchCollection(c, workspaces));

  const { effectiveSelection, hasCollection, hasFolder, hasRequest } = useMemo(
    () => getSelectionInfo({ collections: visibleCollections, selectedUids: selectedSidebarUids }),
    [visibleCollections, selectedSidebarUids]
  );

  const isPureCollectionSelection = hasCollection && !hasFolder && !hasRequest;
  const canDelete = !hasCollection && (hasFolder || hasRequest);
  const collapsibleEntries = effectiveSelection.filter((entry) => entry.type !== 'request');
  const canCollapse = collapsibleEntries.length > 0;
  const allCollapsed = canCollapse && collapsibleEntries.every(isEntryCollapsed);

  const otherCollections = getOtherCollections(visibleCollections, effectiveSelection.map((entry) => entry.uid));
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

  const toggleCollections = async (entries, targetCollapsed) => {
    try {
      if (!targetCollapsed) {
        const collectionsToMount = entries.filter((entry) => {
          const c = entry.type === 'collection' ? entry.collection : entry;
          return c.type !== 'folder' && c.type !== 'request' && c.mountStatus !== 'mounted' && c.mountStatus !== 'mounting';
        });

        await Promise.all(
          collectionsToMount.map((entry) => {
            const c = entry.type === 'collection' ? entry.collection : entry;
            return dispatch(mountCollection({
              collectionUid: c.uid,
              collectionPathname: c.pathname,
              brunoConfig: c.brunoConfig
            }));
          })
        );
      }

      entries.forEach((entry) => {
        // If entry is a raw collection (from otherCollections)
        if (!entry.type) {
          if (entry.collapsed === targetCollapsed) return;
          dispatch(targetCollapsed ? collapseCollection(entry.uid) : expandCollection(entry.uid));
          return;
        }

        // If entry is a selection entry (from effectiveSelection)
        if (isEntryCollapsed(entry) === targetCollapsed) return;

        if (entry.type === 'collection') {
          dispatch(targetCollapsed ? collapseCollection(entry.uid) : expandCollection(entry.uid));
        } else {
          dispatch(
            targetCollapsed
              ? collapseItem({ collectionUid: entry.collectionUid, itemUid: entry.uid })
              : expandItem({ collectionUid: entry.collectionUid, itemUid: entry.uid })
          );
        }
      });
      clearAndClose();
    } catch (err) {
      toast.error('An error occurred while toggling collections');
    }
  };

  const handleToggleCollapse = () => toggleCollections(collapsibleEntries, !allCollapsed);
  const handleToggleCollapseOthers = () => toggleCollections(otherCollections, !allOthersCollapsed);

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
          <div className="dropdown-item" onClick={handleCloseCollections}>
            <IconX size={16} strokeWidth={2} className="dropdown-icon" />
            Remove
          </div>
          <div className="dropdown-item" onClick={handleToggleCollapse}>
            <CollapseIcon size={16} strokeWidth={2} className="dropdown-icon" />
            {collapseLabel}
          </div>
          {hasOtherCollections ? (
            <>
              <div className="dropdown-item" onClick={handleCloseOthers}>
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
