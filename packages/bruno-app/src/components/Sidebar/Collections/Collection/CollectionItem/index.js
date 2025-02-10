import React, { useState, useRef, forwardRef, useEffect } from 'react';
import range from 'lodash/range';
import filter from 'lodash/filter';
import classnames from 'classnames';
import { useDrag, useDrop } from 'react-dnd';
import { IconChevronRight, IconDots } from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { addTab, focusTab, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import { moveItem, showInFolder, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { collectionFolderClicked } from 'providers/ReduxStore/slices/collections';
import Dropdown from 'components/Dropdown';
import NewRequest from 'components/Sidebar/NewRequest';
import NewFolder from 'components/Sidebar/NewFolder';
import RenameCollectionItem from './RenameCollectionItem';
import CloneCollectionItem from './CloneCollectionItem';
import DeleteCollectionItem from './DeleteCollectionItem';
import RunCollectionItem from './RunCollectionItem';
import GenerateCodeItem from './GenerateCodeItem';
import { isItemARequest, isItemAFolder, itemIsOpenedInTabs } from 'utils/tabs';
import { doesRequestMatchSearchText, doesFolderHaveItemsMatchSearchText } from 'utils/collections/search';
import { getDefaultRequestPaneTab } from 'utils/collections';
import { hideHomePage } from 'providers/ReduxStore/slices/app';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';
import NetworkError from 'components/ResponsePane/NetworkError/index';
import { findItemInCollection } from 'utils/collections';
import CollectionItemIcon from './CollectionItemIcon';
import { scrollToTheActiveTab } from 'utils/tabs';

const CollectionItem = ({ item, collection, searchText }) => {
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isSidebarDragging = useSelector((state) => state.app.isDragging);
  const dispatch = useDispatch();
  const collectionItemRef = useRef(null);

  const [renameItemModalOpen, setRenameItemModalOpen] = useState(false);
  const [cloneItemModalOpen, setCloneItemModalOpen] = useState(false);
  const [deleteItemModalOpen, setDeleteItemModalOpen] = useState(false);
  const [generateCodeItemModalOpen, setGenerateCodeItemModalOpen] = useState(false);
  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [runCollectionModalOpen, setRunCollectionModalOpen] = useState(false);

  const hasSearchText = searchText && searchText?.trim()?.length;
  const itemIsCollapsed = hasSearchText ? false : item.collapsed;

  const [{ isDragging }, drag] = useDrag({
    type: `collection-item-${collection.uid}`,
    item: item,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    options: {
      dropEffect: "move"
    }
  });

  const [{ isOver }, drop] = useDrop({
    accept: `collection-item-${collection.uid}`,
    drop: (draggedItem) => {
      dispatch(moveItem(collection.uid, draggedItem.uid, item.uid));
    },
    canDrop: (draggedItem) => {
      return draggedItem.uid !== item.uid;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  drag(drop(collectionItemRef));

  const dropdownTippyRef = useRef();
  const MenuIcon = forwardRef((props, ref) => {
    return (
      <div ref={ref}>
        <IconDots size={22} />
      </div>
    );
  });

  const iconClassName = classnames({
    'rotate-90': !itemIsCollapsed
  });

  const itemRowClassName = classnames('flex collection-item-name items-center', {
    'item-focused-in-tab': item.uid == activeTabUid,
    'dnd-drag-over': isOver,
    // Show drop-placement-highlight unless the dragged-item can be dropped into
    // folder, i.e. if this item happens to be a folder.
    'dnd-hl-drop-after': isOver && item.type !== 'folder'
  });

  const handleRun = async () => {
    dispatch(sendRequest(item, collection.uid)).catch((err) =>
      toast.custom((t) => <NetworkError onClose={() => toast.dismiss(t.id)} />, {
        duration: 5000
      })
    );
  };

  const handleClick = (event) => {
    if (event.detail != 1) return;
    //scroll to the active tab
    setTimeout(scrollToTheActiveTab, 50);
  
    const isRequest = isItemARequest(item);
  
    if (isRequest) {
      dispatch(hideHomePage());
      if (itemIsOpenedInTabs(item, tabs)) {
        dispatch(
          focusTab({
            uid: item.uid
          })
        );
        return;
      }
  
      dispatch(
        addTab({
          uid: item.uid,
          collectionUid: collection.uid,
          requestPaneTab: getDefaultRequestPaneTab(item),
          type: 'request',
        })
      );
    } else {
      dispatch(
        addTab({
          uid: item.uid,
          collectionUid: collection.uid,
          type: 'folder-settings',
        })
      );
      dispatch(
        collectionFolderClicked({
          itemUid: item.uid,
          collectionUid: collection.uid
        })
      );
    }
  };

  const handleFolderCollapse = (e) => {
    e.stopPropagation();
    e.preventDefault();
    dispatch(
      collectionFolderClicked({
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  }

  const handleRightClick = (event) => {
    const _menuDropdown = dropdownTippyRef.current;
    if (_menuDropdown) {
      let menuDropdownBehavior = 'show';
      if (_menuDropdown.state.isShown) {
        menuDropdownBehavior = 'hide';
      }
      _menuDropdown[menuDropdownBehavior]();
    }
  };

  let indents = range(item.depth);
  const onDropdownCreate = (ref) => (dropdownTippyRef.current = ref);
  const isFolder = isItemAFolder(item);

  const className = classnames('flex flex-col w-full', {
    'is-sidebar-dragging': isSidebarDragging
  });

  if (searchText && searchText.length) {
    if (isItemARequest(item)) {
      if (!doesRequestMatchSearchText(item, searchText)) {
        return null;
      }
    } else {
      if (!doesFolderHaveItemsMatchSearchText(item, searchText)) {
        return null;
      }
    }
  }

  const handleDoubleClick = (event) => {
    dispatch(makeTabPermanent({ uid: item.uid }))
  };

  // we need to sort request items by seq property
  const sortRequestItems = (items = []) => {
    return items.sort((a, b) => a.seq - b.seq);
  };

  // we need to sort folder items by name alphabetically
  const sortFolderItems = (items = []) => {
    return items.sort((a, b) => a.name.localeCompare(b.name));
  };
  const handleGenerateCode = (e) => {
    e.stopPropagation();
    dropdownTippyRef.current.hide();
    if (item?.request?.url !== '' || (item?.draft?.request?.url !== undefined && item?.draft?.request?.url !== '')) {
      setGenerateCodeItemModalOpen(true);
    } else {
      toast.error('URL is required');
    }
  };

  const viewFolderSettings = () => {
    if (isItemAFolder(item)) {
      if (itemIsOpenedInTabs(item, tabs)) {
        dispatch(
          focusTab({
            uid: item.uid
          })
        );
        return;
      }
      dispatch(
        addTab({
          uid: item.uid,
          collectionUid: collection.uid,
          type: 'folder-settings'
        })
      );
      return;
    }
  };

  const handleShowInFolder = () => {
    dispatch(showInFolder(item.pathname)).catch((error) => {
      console.error('Error opening the folder', error);
      toast.error('Error opening the folder');
    });
  };

  const requestItems = sortRequestItems(filter(item.items, (i) => isItemARequest(i)));
  const folderItems = sortFolderItems(filter(item.items, (i) => isItemAFolder(i)));

  return (
    <StyledWrapper className={className}>
      {renameItemModalOpen && (
        <RenameCollectionItem item={item} collection={collection} onClose={() => setRenameItemModalOpen(false)} />
      )}
      {cloneItemModalOpen && (
        <CloneCollectionItem item={item} collection={collection} onClose={() => setCloneItemModalOpen(false)} />
      )}
      {deleteItemModalOpen && (
        <DeleteCollectionItem item={item} collection={collection} onClose={() => setDeleteItemModalOpen(false)} />
      )}
      {newRequestModalOpen && (
        <NewRequest item={item} collection={collection} onClose={() => setNewRequestModalOpen(false)} />
      )}
      {newFolderModalOpen && (
        <NewFolder item={item} collection={collection} onClose={() => setNewFolderModalOpen(false)} />
      )}
      {runCollectionModalOpen && (
        <RunCollectionItem collection={collection} item={item} onClose={() => setRunCollectionModalOpen(false)} />
      )}
      {generateCodeItemModalOpen && (
        <GenerateCodeItem collection={collection} item={item} onClose={() => setGenerateCodeItemModalOpen(false)} />
      )}
      <div className={itemRowClassName} ref={collectionItemRef}>
        <div className="flex items-center h-full w-full">
          {indents && indents.length
            ? indents.map((i) => {
                return (
                  <div
                    onClick={handleClick}
                    onContextMenu={handleRightClick}
                    onDoubleClick={handleDoubleClick}
                    className="indent-block"
                    key={i}
                    style={{
                      width: 16,
                      minWidth: 16,
                      height: '100%'
                    }}
                  >
                    &nbsp;{/* Indent */}
                  </div>
                );
              })
            : null}
          <div
            className="flex flex-grow items-center h-full overflow-hidden"
            style={{
              paddingLeft: 8
            }}
            onClick={handleClick}
            onContextMenu={handleRightClick}
            onDoubleClick={handleDoubleClick}
          >
            <div style={{ width: 16, minWidth: 16 }}>
              {isFolder ? (
                <IconChevronRight
                  size={16}
                  strokeWidth={2}
                  className={iconClassName}
                  style={{ color: 'rgb(160 160 160)' }}
                  onClick={handleFolderCollapse}
                />
              ) : null}
            </div>

            <div 
              className="ml-1 flex w-full h-full items-center overflow-hidden"
            >
              <CollectionItemIcon item={item} />
              <span className="item-name" title={item.name}>
                {item.name}
              </span>
            </div>
          </div>
          <div className="menu-icon pr-2">
            <Dropdown onCreate={onDropdownCreate} icon={<MenuIcon />} placement="bottom-start">
              {isFolder && (
                <>
                  <div
                    className="dropdown-item"
                    onClick={(e) => {
                      dropdownTippyRef.current.hide();
                      setNewRequestModalOpen(true);
                    }}
                  >
                    New Request
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={(e) => {
                      dropdownTippyRef.current.hide();
                      setNewFolderModalOpen(true);
                    }}
                  >
                    New Folder
                  </div>
                  <div
                    className="dropdown-item"
                    onClick={(e) => {
                      dropdownTippyRef.current.hide();
                      setRunCollectionModalOpen(true);
                    }}
                  >
                    Run
                  </div>
                </>
              )}
              <div
                className="dropdown-item"
                onClick={(e) => {
                  dropdownTippyRef.current.hide();
                  setRenameItemModalOpen(true);
                }}
              >
                Rename
              </div>
              <div
                className="dropdown-item"
                onClick={(e) => {
                  dropdownTippyRef.current.hide();
                  setCloneItemModalOpen(true);
                }}
              >
                Clone
              </div>
              {!isFolder && (
                <div
                  className="dropdown-item"
                  onClick={(e) => {
                    dropdownTippyRef.current.hide();
                    handleClick(null);
                    handleRun();
                  }}
                >
                  Run
                </div>
              )}
              {!isFolder && (item.type === 'http-request' || item.type === 'graphql-request') && (
                <div
                  className="dropdown-item"
                  onClick={(e) => {
                    handleGenerateCode(e);
                  }}
                >
                  Generate Code
                </div>
              )}
              <div
                className="dropdown-item"
                onClick={(e) => {
                  dropdownTippyRef.current.hide();
                  handleShowInFolder();
                }}
              >
                Show in Folder
              </div>
              <div
                className="dropdown-item delete-item"
                onClick={(e) => {
                  dropdownTippyRef.current.hide();
                  setDeleteItemModalOpen(true);
                }}
              >
                Delete
              </div>
              {isFolder && (
                <div
                  className="dropdown-item"
                  onClick={(e) => {
                    dropdownTippyRef.current.hide();
                    viewFolderSettings();
                  }}
                >
                  Settings
                </div>
              )}
            </Dropdown>
          </div>
        </div>
      </div>

      {!itemIsCollapsed ? (
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
    </StyledWrapper>
  );
};

export default CollectionItem;