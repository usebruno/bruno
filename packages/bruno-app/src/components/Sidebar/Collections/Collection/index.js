import React, { useState, forwardRef, useRef, useEffect } from 'react';
import classnames from 'classnames';
import { uuid } from 'utils/common';
import filter from 'lodash/filter';
import { useDrop } from 'react-dnd';
import { IconChevronRight, IconDots, IconLoader2 } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { collapseCollection } from 'providers/ReduxStore/slices/collections';
import { mountCollection, moveItemToRootOfCollection } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch } from 'react-redux';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import NewRequest from 'components/Sidebar/NewRequest';
import NewFolder from 'components/Sidebar/NewFolder';
import CollectionItem from './CollectionItem';
import RemoveCollection from './RemoveCollection';
import ExportCollection from './ExportCollection';
import { doesCollectionHaveItemsMatchingSearchText } from 'utils/collections/search';
import { isItemAFolder, isItemARequest } from 'utils/collections';

import RenameCollection from './RenameCollection';
import StyledWrapper from './StyledWrapper';
import CloneCollection from './CloneCollection';
import { areItemsLoading } from 'utils/collections';

const Collection = ({ collection, searchText }) => {
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showRenameCollectionModal, setShowRenameCollectionModal] = useState(false);
  const [showCloneCollectionModalOpen, setShowCloneCollectionModalOpen] = useState(false);
  const [showExportCollectionModal, setShowExportCollectionModal] = useState(false);
  const [showRemoveCollectionModal, setShowRemoveCollectionModal] = useState(false);
  const dispatch = useDispatch();
  const isLoading = areItemsLoading(collection);

  const menuDropdownTippyRef = useRef();
  const onMenuDropdownCreate = (ref) => (menuDropdownTippyRef.current = ref);
  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="pr-2">
        <IconDots size={22} />
      </div>
    );
  });

  const handleRun = () => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'collection-runner'
      })
    );
  };

  const hasSearchText = searchText && searchText?.trim()?.length;
  const collectionIsCollapsed = hasSearchText ? false : collection.collapsed;

  const iconClassName = classnames({
    'rotate-90': !collectionIsCollapsed
  });

  const handleClick = (event) => {
    // Check if the click came from the chevron icon
    const isChevronClick = event.target.closest('svg')?.classList.contains('chevron-icon');

    if (collection.mountStatus === 'unmounted') {
      dispatch(mountCollection({
        collectionUid: collection.uid,
        collectionPathname: collection.pathname,
        brunoConfig: collection.brunoConfig
      }));
    }
    dispatch(collapseCollection(collection.uid));
    
    // Only open collection settings if not clicking the chevron
    if(!isChevronClick) {
      dispatch(
        addTab({
          uid: uuid(),
          collectionUid: collection.uid,
          type: 'collection-settings'
        })
      );
    }
  };

  const handleRightClick = (event) => {
    const _menuDropdown = menuDropdownTippyRef.current;
    if (_menuDropdown) {
      let menuDropdownBehavior = 'show';
      if (_menuDropdown.state.isShown) {
        menuDropdownBehavior = 'hide';
      }
      _menuDropdown[menuDropdownBehavior]();
    }
  };

  const viewCollectionSettings = () => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        type: 'collection-settings'
      })
    );
  };

  const [{ isOver }, drop] = useDrop({
    accept: `COLLECTION_ITEM_${collection.uid}`,
    drop: (draggedItem) => {
      dispatch(moveItemToRootOfCollection(collection.uid, draggedItem.uid));
    },
    canDrop: (draggedItem) => {
      // todo need to make sure that draggedItem belongs to the collection
      return true;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  if (searchText && searchText.length) {
    if (!doesCollectionHaveItemsMatchingSearchText(collection, searchText)) {
      return null;
    }
  }

  // we need to sort request items by seq property
  const sortRequestItems = (items = []) => {
    return items.sort((a, b) => a.seq - b.seq);
  };

  // we need to sort folder items by name alphabetically
  const sortFolderItems = (items = []) => {
    return items.sort((a, b) => a.name.localeCompare(b.name));
  };

  const requestItems = sortRequestItems(filter(collection.items, (i) => isItemARequest(i)));
  const folderItems = sortFolderItems(filter(collection.items, (i) => isItemAFolder(i)));

  return (
    <StyledWrapper className="flex flex-col">
      {showNewRequestModal && <NewRequest collection={collection} onClose={() => setShowNewRequestModal(false)} />}
      {showNewFolderModal && <NewFolder collection={collection} onClose={() => setShowNewFolderModal(false)} />}
      {showRenameCollectionModal && (
        <RenameCollection collection={collection} onClose={() => setShowRenameCollectionModal(false)} />
      )}
      {showRemoveCollectionModal && (
        <RemoveCollection collection={collection} onClose={() => setShowRemoveCollectionModal(false)} />
      )}
      {showExportCollectionModal && (
        <ExportCollection collection={collection} onClose={() => setShowExportCollectionModal(false)} />
      )}
      {showCloneCollectionModalOpen && (
        <CloneCollection collection={collection} onClose={() => setShowCloneCollectionModalOpen(false)} />
      )}
      <div className="flex py-1 collection-name items-center" ref={drop}>
        <div
          className="flex flex-grow items-center overflow-hidden"
          onClick={handleClick}
          onContextMenu={handleRightClick}
        >
          <IconChevronRight
            size={16}
            strokeWidth={2}
            className={`chevron-icon ${iconClassName}`}
            style={{ width: 16, minWidth: 16, color: 'rgb(160 160 160)' }}
          />
          <div className="ml-1" id="sidebar-collection-name">
            {collection.name}
          </div>
          {isLoading ? <IconLoader2 className="animate-spin mx-1" size={18} strokeWidth={1.5} /> : null}
        </div>
        <div className="collection-actions">
          <Dropdown onCreate={onMenuDropdownCreate} icon={<MenuIcon />} placement="bottom-start">
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                setShowNewRequestModal(true);
              }}
            >
              New Request
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                setShowNewFolderModal(true);
              }}
            >
              New Folder
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                setShowCloneCollectionModalOpen(true);
              }}
            >
              Clone
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                handleRun();
              }}
            >
              Run
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                setShowRenameCollectionModal(true);
              }}
            >
              Rename
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                setShowExportCollectionModal(true);
              }}
            >
              Export
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                setShowRemoveCollectionModal(true);
              }}
            >
              Remove
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                viewCollectionSettings();
              }}
            >
              Settings
            </div>
          </Dropdown>
        </div>
      </div>

      <div>
        {!collectionIsCollapsed ? (
          <div>
            {folderItems && folderItems.length
              ? folderItems.map((i) => {
                  return <CollectionItem key={i.uid} item={i} collection={collection} searchText={searchText} />;
                })
              : null}
            {requestItems && requestItems.length
              ? requestItems.map((i) => {
                  return <CollectionItem key={i.uid} item={i} collection={collection} searchText={searchText} />;
                })
              : null}
          </div>
        ) : null}
      </div>
    </StyledWrapper>
  );
};

export default Collection;
