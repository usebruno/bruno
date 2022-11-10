import React, { useState, forwardRef, useRef, useEffect } from 'react';
import classnames from 'classnames';
import filter from 'lodash/filter';
import cloneDeep from 'lodash/cloneDeep';
import { DndProvider } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';
import { IconChevronRight, IconDots } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { collectionClicked } from 'providers/ReduxStore/slices/collections';
import { useDispatch } from 'react-redux';
import NewRequest from 'components/Sidebar/NewRequest';
import NewFolder from 'components/Sidebar/NewFolder';
import CollectionItem from './CollectionItem';
import RemoveCollectionFromWorkspace from './RemoveCollectionFromWorkspace';
import RemoveLocalCollection from './RemoveLocalCollection';
import { doesCollectionHaveItemsMatchingSearchText } from 'utils/collections/search';
import { isItemAFolder, isItemARequest, transformCollectionToSaveToIdb, isLocalCollection } from 'utils/collections';
import exportCollection from 'utils/collections/export';

import RenameCollection from './RenameCollection';
import DeleteCollection from './DeleteCollection';
import StyledWrapper from './StyledWrapper';

const Collection = ({ collection, searchText }) => {
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showRenameCollectionModal, setShowRenameCollectionModal] = useState(false);
  const [showRemoveCollectionFromWSModal, setShowRemoveCollectionFromWSModal] = useState(false);
  const [showRemoveLocalCollectionModal, setShowRemoveLocalCollectionModal] = useState(false);
  const [showDeleteCollectionModal, setShowDeleteCollectionModal] = useState(false);
  const [collectionIsCollapsed, setCollectionIsCollapsed] = useState(collection.collapsed);
  const dispatch = useDispatch();

  const menuDropdownTippyRef = useRef();
  const onMenuDropdownCreate = (ref) => (menuDropdownTippyRef.current = ref);
  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref} className="pr-2">
        <IconDots size={22} />
      </div>
    );
  });

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

  if (searchText && searchText.length) {
    if (!doesCollectionHaveItemsMatchingSearchText(collection, searchText)) {
      return null;
    }
  }

  const requestItems = filter(collection.items, (i) => isItemARequest(i));
  const folderItems = filter(collection.items, (i) => isItemAFolder(i));

  const handleExportClick = () => {
    const collectionCopy = cloneDeep(collection);
    exportCollection(transformCollectionToSaveToIdb(collectionCopy));
  };

  const isLocal = isLocalCollection(collection);

  return (
    <StyledWrapper className="flex flex-col">
      {showNewRequestModal && <NewRequest collection={collection} onClose={() => setShowNewRequestModal(false)} />}
      {showNewFolderModal && <NewFolder collection={collection} onClose={() => setShowNewFolderModal(false)} />}
      {showRenameCollectionModal && <RenameCollection collection={collection} onClose={() => setShowRenameCollectionModal(false)} />}
      {showRemoveCollectionFromWSModal && <RemoveCollectionFromWorkspace collection={collection} onClose={() => setShowRemoveCollectionFromWSModal(false)} />}
      {showDeleteCollectionModal && <DeleteCollection collection={collection} onClose={() => setShowDeleteCollectionModal(false)} />}
      {showRemoveLocalCollectionModal && <RemoveLocalCollection collection={collection} onClose={() => setShowRemoveLocalCollectionModal(false)} />}
      <div className="flex py-1 collection-name items-center">
        <div className="flex flex-grow items-center" onClick={handleClick}>
          <IconChevronRight size={16} strokeWidth={2} className={iconClassName} style={{ width: 16, color: 'rgb(160 160 160)' }} />
          <div className="ml-1" id="sidebar-collection-name">{collection.name}</div>
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
            {!isLocal ? (
              <div
                className="dropdown-item"
                onClick={(e) => {
                  menuDropdownTippyRef.current.hide();
                  setShowRenameCollectionModal(true);
                }}
              >
                Rename
              </div>
            ) : null}
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                handleExportClick(true);
              }}
            >
              Export
            </div>
            {!isLocal ? (
              <div
                className="dropdown-item"
                onClick={(e) => {
                  menuDropdownTippyRef.current.hide();
                  setShowRemoveCollectionFromWSModal(true);
                }}
              >
                Remove from Workspace
              </div>
            ) : (
              <div
                className="dropdown-item"
                onClick={(e) => {
                  menuDropdownTippyRef.current.hide();
                  setShowRemoveLocalCollectionModal(true);
                }}
              >
                Remove
              </div>
            )}
            {!isLocal ? (
              <div
                className="dropdown-item delete-collection"
                onClick={(e) => {
                  menuDropdownTippyRef.current.hide();
                  setShowDeleteCollectionModal(true);
                }}
              >
                Delete
              </div>
            ) : null}
          </Dropdown>
        </div>
      </div>

      <div>
        {!collectionIsCollapsed ? (
          <DndProvider backend={HTML5Backend}>
            <div>
              {requestItems && requestItems.length
                ? requestItems.map((i) => {
                    return <CollectionItem key={i.uid} item={i} collection={collection} searchText={searchText} />;
                  })
                : null}

              {folderItems && folderItems.length
                ? folderItems.map((i) => {
                    return <CollectionItem key={i.uid} item={i} collection={collection} searchText={searchText} />;
                  })
                : null}
            </div>
          </DndProvider>
        ) : null}
      </div>
    </StyledWrapper>
  );
};

export default Collection;
