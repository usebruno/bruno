import React, { useMemo, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import MenuDropdown from 'ui/MenuDropdown';
import { IconX, IconFoldDown, IconFoldUp, IconTrash } from '@tabler/icons';
import { collapseCollection, collapseItem, expandCollection, expandItem, clearSidebarSelection } from 'providers/ReduxStore/slices/collections';
import toast from 'react-hot-toast';
import { getSelectionInfo, isScratchCollection } from 'utils/collections/index';
import { mountCollection } from 'providers/ReduxStore/slices/collections/actions';

const isEntryCollapsed = (entry) => (entry.type === 'collection' ? entry.collection.collapsed : entry.item.collapsed);

const BulkActionsDropdown = ({ visible, onClose, position, onRequestRemoveCollections, onRequestDeleteItems }) => {
  const dispatch = useDispatch();

  const selectedSidebarUids = useSelector((state) => state.collections.selectedSidebarUids);
  const collections = useSelector((state) => state.collections.collections);
  const workspaces = useSelector((state) => state.workspaces.workspaces);
  // This will filter out the scratch collections from the list
  const visibleCollections = useMemo(
    () => collections.filter((c) => !isScratchCollection(c, workspaces)),
    [collections, workspaces]
  );

  const { effectiveSelection, hasCollection, hasFolder, hasRequest, hasApp } = useMemo(
    () => getSelectionInfo({ collections: visibleCollections, selectedUids: selectedSidebarUids }),
    [visibleCollections, selectedSidebarUids]
  );

  const isPureCollectionSelection = hasCollection && !hasFolder && !hasRequest && !hasApp;
  const canDelete = !hasCollection && (hasFolder || hasRequest || hasApp);
  const collapsibleEntries = effectiveSelection.filter((entry) => entry.type === 'collection' || entry.type === 'folder');
  const canCollapse = collapsibleEntries.length > 0;
  const allCollapsed = canCollapse && collapsibleEntries.every(isEntryCollapsed);

  const clearAndClose = useCallback(() => {
    dispatch(clearSidebarSelection());
    onClose();
  }, [dispatch, onClose]);

  const closeCollections = useCallback((list) => {
    onRequestRemoveCollections(list.map((entry) => entry.uid));
    onClose();
  }, [onRequestRemoveCollections, onClose]);

  /**
   * Toggles the collapse/expand state for a given list of entries (collections, folders, or requests).
   * It ensures that any collections which are about to be expanded are first mounted in the Redux store.
   *
   * @param {Array} entries - The list of entries to toggle. Can be wrapper objects (for selected items) or raw collection objects (for unselected collections).
   * @param {boolean} isTargetCollapsed - The target state: true to collapse, false to expand.
   */
  const toggleCollections = useCallback(async (entries, isTargetCollapsed) => {
    try {
      if (!isTargetCollapsed) {
        const collectionsToMount = entries.filter((entry) => {
          return entry.type === 'collection' && entry.collection.mountStatus !== 'mounted' && entry.collection.mountStatus !== 'mounting';
        });

        await Promise.all(
          collectionsToMount.map((entry) => {
            return dispatch(mountCollection({
              collectionUid: entry.collection.uid,
              collectionPathname: entry.collection.pathname,
              brunoConfig: entry.collection.brunoConfig
            }));
          })
        );
      }

      entries.forEach((entry) => {
        if (isEntryCollapsed(entry) === isTargetCollapsed) return;

        if (entry.type === 'collection') {
          dispatch(isTargetCollapsed ? collapseCollection(entry.uid) : expandCollection(entry.uid));
        } else {
          dispatch(
            isTargetCollapsed
              ? collapseItem({ collectionUid: entry.collectionUid, itemUid: entry.uid })
              : expandItem({ collectionUid: entry.collectionUid, itemUid: entry.uid })
          );
        }
      });
      clearAndClose();
    } catch (err) {
      toast.error('An error occurred while toggling collections');
    }
  }, [dispatch, clearAndClose]);

  const getCollapseDisplay = (isCollapsed, suffix = '') => {
    const action = isCollapsed ? 'Expand' : 'Collapse';
    return {
      Icon: isCollapsed ? IconFoldUp : IconFoldDown,
      label: `${action}${suffix ? ` ${suffix}` : ''}`
    };
  };

  const { Icon: CollapseIcon, label: collapseLabel } = getCollapseDisplay(allCollapsed, 'Selected');

  const anchorStyle = {
    position: 'fixed',
    left: `${position?.x || 0}px`,
    top: `${position?.y || 0}px`,
    width: '1px',
    height: '1px',
    pointerEvents: 'none'
  };

  const menuItems = useMemo(() => {
    if (isPureCollectionSelection) {
      const items = [
        {
          id: 'remove',
          label: 'Remove Selected',
          leftSection: IconX,
          onClick: () => closeCollections(effectiveSelection)
        },
        {
          id: 'collapse',
          label: collapseLabel,
          leftSection: CollapseIcon,
          onClick: () => toggleCollections(collapsibleEntries, !allCollapsed)
        }
      ];

      return items;
    }

    const items = [];
    if (canCollapse) {
      items.push({
        id: 'collapse',
        label: collapseLabel,
        leftSection: CollapseIcon,
        onClick: () => toggleCollections(collapsibleEntries, !allCollapsed)
      });
    }
    if (canDelete) {
      items.push({
        id: 'delete',
        label: 'Delete',
        leftSection: IconTrash,
        className: 'delete-item',
        onClick: () => {
          onRequestDeleteItems(effectiveSelection);
          onClose();
        }
      });
    }

    return items;
  }, [
    isPureCollectionSelection,
    canCollapse,
    canDelete,
    collapseLabel,
    CollapseIcon,
    closeCollections,
    effectiveSelection,
    toggleCollections,
    collapsibleEntries,
    allCollapsed,
    onRequestDeleteItems,
    onClose
  ]);

  return (
    <MenuDropdown
      items={menuItems}
      placement="right-start"
      opened={visible}
      onChange={(isOpen) => !isOpen && onClose()}
      appendTo={document.body}
    >
      <div style={anchorStyle} />
    </MenuDropdown>
  );
};

export default BulkActionsDropdown;
