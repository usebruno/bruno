import React, { useState, useRef, forwardRef, useEffect } from 'react';
import range from 'lodash/range';
import filter from 'lodash/filter';
import classnames from 'classnames';
import { useDrag, useDrop } from 'react-dnd';
import { IconChevronRight, IconDots } from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { addTab, focusTab, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import { moveItem, sendRequest, showInFolder, updateItemsSequences } from 'providers/ReduxStore/slices/collections/actions';
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
import CollectionItemInfo from './CollectionItemInfo/index';
import CollectionItemIcon from './CollectionItemIcon';
import { scrollToTheActiveTab } from 'utils/tabs';
import path from 'utils/common/path';
import { findParentItemInCollection, getReorderedItems, getReorderedItemsAfterMove } from 'utils/collections/index';
import { cloneDeep } from 'lodash';

const CollectionItem = ({ item, collection, searchText }) => {
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isSidebarDragging = useSelector((state) => state.app.isDragging);
  const dispatch = useDispatch();

  // We use a single ref for drag and drop.
  const ref = useRef(null);

  const [renameItemModalOpen, setRenameItemModalOpen] = useState(false);
  const [cloneItemModalOpen, setCloneItemModalOpen] = useState(false);
  const [deleteItemModalOpen, setDeleteItemModalOpen] = useState(false);
  const [generateCodeItemModalOpen, setGenerateCodeItemModalOpen] = useState(false);
  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [runCollectionModalOpen, setRunCollectionModalOpen] = useState(false);
  const [itemInfoModalOpen, setItemInfoModalOpen] = useState(false);
  const hasSearchText = searchText && searchText?.trim()?.length;
  const itemIsCollapsed = hasSearchText ? false : item.collapsed;
  const isFolder = isItemAFolder(item);

  const [dropPosition, setDropPosition] = useState(null); // 'adjacent' or 'inside'

  const [{ isDragging }, drag] = useDrag({
    type: `COLLECTION_ITEM_${collection.uid}`,
    item: () => item,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    options: {
      dropEffect: "move"
    }
  });

  const determineDropPosition = (monitor) => {
    const hoverBoundingRect = ref.current?.getBoundingClientRect();
    const clientOffset = monitor.getClientOffset();
    if (!hoverBoundingRect || !clientOffset) return null;

    const clientY = clientOffset.y - hoverBoundingRect.top;
    const folderUpperThreshold = hoverBoundingRect.height * 0.35;
    const fileUpperThreshold = hoverBoundingRect.height * 0.5;

    if (isItemAFolder(item)) {
      return clientY < folderUpperThreshold ? 'adjacent' : 'inside';
    } else {
      return clientY < fileUpperThreshold ? 'adjacent' : null;
    }
  };

  const calculateNewPathname = (draggedItem, targetItemPathname, dropPosition) => {
    const targetItemDirname = path.dirname(targetItemPathname);
    const isTargetItemAFolder = isItemAFolder(item);

    if (dropPosition === 'inside' && isTargetItemAFolder) {
      return {
        newPathname: path.join(targetItemPathname, draggedItem.filename),
        dropType: 'inside'
      };
    } else if (dropPosition === 'adjacent') {
      return {
        newPathname: path.join(targetItemDirname, draggedItem.filename),
        dropType: 'adjacent'
      };
    }

    return { newPathname: null, dropType: null };
  };

  const handleMoveToNewLocation = async (draggedItem, newPathname, dropType) => {
    const newDirname = path.dirname(newPathname);
    await dispatch(moveItem({ 
      targetDirname: newDirname, 
      sourcePathname: draggedItem.pathname 
    }));

    // Update sequences in the source directory
    const draggedItemParent = findParentItemInCollection(collection, draggedItem.uid);
    if (draggedItemParent) {
      const sourceDirectoryItems = cloneDeep(draggedItemParent.items);
      const reorderedSourceItems = getReorderedItemsAfterMove({ 
        items: sourceDirectoryItems, 
        draggedItemUid: draggedItem.uid 
      });
      if (reorderedSourceItems?.length) {
        dispatch(updateItemsSequences({ itemsToResequence: reorderedSourceItems }));
      }
    }

    // Update sequences in the target directory if dropping adjacent
    if (dropType === 'adjacent') {
      const targetItemParent = findParentItemInCollection(collection, item.uid) || collection;
      const targetDirectoryItems = cloneDeep(targetItemParent.items);
      const targetItemSequence = targetDirectoryItems.findIndex(i => i.uid === item.uid)?.seq;
      
      const draggedItemWithNewPath = { 
        ...draggedItem, 
        pathname: newPathname, 
        seq: targetItemSequence 
      };
      
      const reorderedTargetItems = getReorderedItems({ 
        items: [...targetDirectoryItems, draggedItemWithNewPath], 
        targetItemUid: item.uid, 
        draggedItemUid: draggedItem.uid 
      });
      
      if (reorderedTargetItems?.length) {
        dispatch(updateItemsSequences({ itemsToResequence: reorderedTargetItems }));
      }
    }
  };

  const handleReorderInSameLocation = async (draggedItem, targetItemUid) => {
    const targetItemParent = findParentItemInCollection(collection, targetItemUid) || collection;
    const targetDirectoryItems = cloneDeep(targetItemParent.items);
    
    const reorderedItems = getReorderedItems({ 
      items: targetDirectoryItems, 
      targetItemUid, 
      draggedItemUid: draggedItem.uid 
    });
    
    if (reorderedItems?.length) {
      dispatch(updateItemsSequences({ itemsToResequence: reorderedItems }));
    }
  };

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: `COLLECTION_ITEM_${collection.uid}`,
    hover: (draggedItem, monitor) => {
      const { uid: targetItemUid } = item;
      const { uid: draggedItemUid } = draggedItem;

      if (draggedItemUid === targetItemUid) return;

      const dropPosition = determineDropPosition(monitor);
      setDropPosition(dropPosition);
    },
    drop: async (draggedItem, monitor) => {
      const { uid: targetItemUid, pathname: targetItemPathname } = item;
      const { uid: draggedItemUid, pathname: draggedItemPathname } = draggedItem;
  
      if (draggedItemUid === targetItemUid) return;
  
      const dropPosition = determineDropPosition(monitor);
      if (!dropPosition) return;
  
      const { newPathname, dropType } = calculateNewPathname(draggedItem, targetItemPathname, dropPosition);
      if (!newPathname) return;
  
      if (newPathname !== draggedItemPathname) {
        await handleMoveToNewLocation(draggedItem, newPathname, dropType);
      } else {
        await handleReorderInSameLocation(draggedItem, targetItemUid);
      }
  
      setDropPosition(null);
    },
    canDrop: (draggedItem) => draggedItem.uid !== item.uid,
    collect: (monitor) => ({
      isOver: monitor.isOver()
    }),
  });

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

  const itemRowClassName = classnames('flex collection-item-name relative items-center', {
    'item-focused-in-tab': item.uid == activeTabUid,
    'item-hovered': isOver && canDrop,
    'drop-target': isOver && dropPosition === 'inside',
    'drop-target-above': isOver && dropPosition === 'adjacent'
  });

  const handleRun = async () => {
    dispatch(sendRequest(item, collection.uid)).catch((err) =>
      toast.custom((t) => <NetworkError onClose={() => toast.dismiss(t.id)} />, {
        duration: 5000
      })
    );
  };

  const handleClick = (event) => {
    if (event && event.detail != 1) return;
    //scroll to the active tab
    setTimeout(scrollToTheActiveTab, 50);
    const isRequest = isItemARequest(item);
    if (isRequest) {
      dispatch(hideHomePage());
      if (itemIsOpenedInTabs(item, tabs)) {
        dispatch(focusTab({ uid: item.uid }));
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
  };

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
    dispatch(makeTabPermanent({ uid: item.uid }));
  };

  // Sort items by their "seq" property.
  const sortItemsBySequence = (items = []) => {
    return items.sort((a, b) => a.seq - b.seq);
  };

  const handleShowInFolder = () => {
    dispatch(showInFolder(item.pathname)).catch((error) => {
      console.error('Error opening the folder', error);
      toast.error('Error opening the folder');
    });
  };

  const folderItems = sortItemsBySequence(filter(item.items, (i) => isItemAFolder(i))); 
  const requestItems = sortItemsBySequence(filter(item.items, (i) => isItemARequest(i)));

  const handleGenerateCode = (e) => {
    e.stopPropagation();
    dropdownTippyRef.current.hide();
    if (
      (item?.request?.url !== '') ||
      (item?.draft?.request?.url !== undefined && item?.draft?.request?.url !== '')
    ) {
      setGenerateCodeItemModalOpen(true);
    } else {
      toast.error('URL is required');
    }
  };

  const viewFolderSettings = () => {
    if (isItemAFolder(item)) {
      if (itemIsOpenedInTabs(item, tabs)) {
        dispatch(focusTab({ uid: item.uid }));
        return;
      }
      dispatch(
        addTab({
          uid: item.uid,
          collectionUid: collection.uid,
          type: 'folder-settings'
        })
      );
    }
  };

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
      {itemInfoModalOpen && (
        <CollectionItemInfo item={item} collection={collection} onClose={() => setItemInfoModalOpen(false)} />
      )}
      <div
        className={itemRowClassName}
        ref={(node) => {
          ref.current = node;
          drag(drop(node));
        }}
      >
        <div className="flex items-center h-full w-full">
          {indents && indents.length
            ? indents.map((i) => (
                <div
                  onClick={handleClick}
                  onContextMenu={handleRightClick}
                  onDoubleClick={handleDoubleClick}
                  className="indent-block"
                  key={i}
                  style={{ width: 16, minWidth: 16, height: '100%' }}
                >
                  &nbsp;{/* Indent */}
                </div>
              ))
            : null}
          <div
            className="flex flex-grow items-center h-full overflow-hidden"
            style={{ paddingLeft: 8 }}
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
            <div className="ml-1 flex w-full h-full items-center overflow-hidden">
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
              <div
                className="dropdown-item item-info"
                onClick={(e) => {
                  dropdownTippyRef.current.hide();
                  setItemInfoModalOpen(true);
                }}
              >
                Info
              </div>
            </Dropdown>
          </div>
        </div>
      </div>
      {!itemIsCollapsed ? (
        <div>
          {folderItems?.map?.((i) => <CollectionItem key={i.uid} item={i} collection={collection} searchText={searchText} />)}
          {requestItems?.map?.((i) => <CollectionItem key={i.uid} item={i} collection={collection} searchText={searchText} />)}
        </div>
      ) : null}
    </StyledWrapper>
  );
};

export default CollectionItem;