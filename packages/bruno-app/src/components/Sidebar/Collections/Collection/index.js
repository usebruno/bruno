import React, { useState, forwardRef, useRef, useEffect } from 'react';
import classnames from 'classnames';
import { uuid } from 'utils/common';
import filter from 'lodash/filter';
import { useDrop } from 'react-dnd';
import Dropdown from 'components/Dropdown';
import { collectionClicked } from 'providers/ReduxStore/slices/collections';
import { moveItemToRootOfCollection } from 'providers/ReduxStore/slices/collections/actions';
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
import CloneCollection from './CloneCollection/index';
import { DropdownItem } from 'components/Dropdown/DropdownItem/dropdown_item';
import {
  BadgePlus,
  ChevronRight,
  CopyPlus,
  FilePenLine,
  FileUp,
  FolderPlus,
  MoreHorizontal,
  Rocket,
  Settings,
  Trash2
} from 'lucide-react';

const Collection = ({ collection, searchText }) => {
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showRenameCollectionModal, setShowRenameCollectionModal] = useState(false);
  const [showCloneCollectionModalOpen, setShowCloneCollectionModalOpen] = useState(false);
  const [showExportCollectionModal, setShowExportCollectionModal] = useState(false);
  const [showRemoveCollectionModal, setShowRemoveCollectionModal] = useState(false);
  const [collectionIsCollapsed, setCollectionIsCollapsed] = useState(collection.collapsed);
  const dispatch = useDispatch();

  const menuDropdownTippyRef = useRef();
  const onMenuDropdownCreate = (ref) => (menuDropdownTippyRef.current = ref);
  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="group pr-2">
        <MoreHorizontal size={22} className="group-hover:text-slate-950 dark:group-hover:text-white" />
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

  useEffect(() => {
    if (searchText && searchText.length) {
      setCollectionIsCollapsed(false);
    } else {
      setCollectionIsCollapsed(collection.collapsed);
    }
  }, [searchText, collection]);

  const iconClassName = classnames({
    'rotate-90': !collectionIsCollapsed
  });

  const handleClick = (event) => {
    dispatch(collectionClicked(collection.uid));
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
          <ChevronRight size={16} strokeWidth={2} className={iconClassName} />
          <div className="ml-1" id="sidebar-collection-name">
            {collection.name}
          </div>
        </div>
        <div className="collection-actions">
          <Dropdown onCreate={onMenuDropdownCreate} icon={<MenuIcon />} placement="bottom-start">
            <div className="flex flex-col px-1">
              <DropdownItem
                onClick={(e) => {
                  menuDropdownTippyRef.current.hide();
                  setShowNewRequestModal(true);
                }}
              >
                <BadgePlus size={16} className="mr-2" />
                New Request
              </DropdownItem>
              <DropdownItem
                onClick={(e) => {
                  menuDropdownTippyRef.current.hide();
                  setShowNewFolderModal(true);
                }}
              >
                <FolderPlus size={16} className="mr-2" />
                New Folder
              </DropdownItem>
              <DropdownItem
                onClick={(e) => {
                  menuDropdownTippyRef.current.hide();
                  handleRun();
                }}
              >
                <Rocket size={16} className="mr-2" />
                Run
              </DropdownItem>
              <DropdownItem
                onClick={(e) => {
                  menuDropdownTippyRef.current.hide();
                  setShowRenameCollectionModal(true);
                }}
              >
                <FilePenLine size={16} className="mr-2" />
                Rename
              </DropdownItem>
              <DropdownItem
                onClick={(e) => {
                  menuDropdownTippyRef.current.hide();
                  setShowCloneCollectionModalOpen(true);
                }}
              >
                <CopyPlus size={16} className="mr-2" />
                Clone
              </DropdownItem>
              <DropdownItem
                onClick={(e) => {
                  menuDropdownTippyRef.current.hide();
                  setShowExportCollectionModal(true);
                }}
              >
                <FileUp size={16} className="mr-2" />
                Export
              </DropdownItem>
              <DropdownItem
                onClick={(e) => {
                  menuDropdownTippyRef.current.hide();
                  viewCollectionSettings();
                }}
              >
                <Settings size={16} className="mr-2" />
                Settings
              </DropdownItem>
              <DropdownItem
                onClick={(e) => {
                  menuDropdownTippyRef.current.hide();
                  setShowRemoveCollectionModal(true);
                }}
                className="text-red-500 hover:!bg-red-100 dark:hover:!bg-red-400/20"
              >
                <Trash2 size={16} className="mr-2 !text-red-500" />
                Remove
              </DropdownItem>
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
