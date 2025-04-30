import React, { useState, forwardRef, useRef, useEffect } from 'react';
import classnames from 'classnames';
import { uuid } from 'utils/common';
import filter from 'lodash/filter';
import { useDrop, useDrag } from 'react-dnd';
import { IconChevronRight, IconDots, IconLoader2 } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { collapseCollection } from 'providers/ReduxStore/slices/collections';
import { mountCollection, moveItemToRootOfCollection } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch, useSelector } from 'react-redux';
import { addTab, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import NewRequest from 'components/Sidebar/NewRequest';
import NewFolder from 'components/Sidebar/NewFolder';
import CollectionItem from './CollectionItem';
import RemoveCollection from './RemoveCollection';
import { doesCollectionHaveItemsMatchingSearchText } from 'utils/collections/search';
import { isItemAFolder, isItemARequest } from 'utils/collections';

import RenameCollection from './RenameCollection';
import StyledWrapper from './StyledWrapper';
import CloneCollection from './CloneCollection';
import { areItemsLoading, findItemInCollection } from 'utils/collections';
import { scrollToTheActiveTab } from 'utils/tabs';
import ShareCollection from 'components/ShareCollection/index';

const Collection = ({ collection, searchText }) => {
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showRenameCollectionModal, setShowRenameCollectionModal] = useState(false);
  const [showCloneCollectionModalOpen, setShowCloneCollectionModalOpen] = useState(false);
  const [showShareCollectionModal, setShowShareCollectionModal] = useState(false);
  const [showRemoveCollectionModal, setShowRemoveCollectionModal] = useState(false);
  const collectionIsCollapsed = Boolean(collection.collapsed);
  const [isDropTarget, setIsDropTarget] = useState(false);
  const [dropPosition, setDropPosition] = useState(null);
  const dispatch = useDispatch();
  const isLoading = areItemsLoading(collection);
  const collectionRef = useRef(null);

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

  const ensureCollectionIsMounted = () => {
    if (collection.mountStatus === 'unmounted') {
      dispatch(mountCollection({
        collectionUid: collection.uid,
        collectionPathname: collection.pathname,
        brunoConfig: collection.brunoConfig
      }));
    }
  }

  const hasSearchText = searchText && searchText?.trim()?.length;

  const iconClassName = classnames({
    'rotate-90': !collectionIsCollapsed
  });

  const handleClick = (event) => {
    if (event.detail != 1) return;
    // Check if the click came from the chevron icon
    const isChevronClick = event.target.closest('svg')?.classList.contains('chevron-icon');
    setTimeout(scrollToTheActiveTab, 50);
    
    ensureCollectionIsMounted();

    dispatch(collapseCollection(collection.uid));
  
    if(!isChevronClick) {
      dispatch(
        addTab({
          uid: collection.uid,
          collectionUid: collection.uid,
          type: 'collection-settings',
        })
      );
    }
  };

  const handleDoubleClick = (event) => {
    dispatch(makeTabPermanent({ uid: collection.uid }))
  };

  const handleCollectionCollapse = (e) => {
    e.stopPropagation();
    e.preventDefault();
    ensureCollectionIsMounted();
    dispatch(collapseCollection(collection.uid));
  }

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
        uid: collection.uid,
        collectionUid: collection.uid,
        type: 'collection-settings'
      })
    );
  };
  const isCollectionItem = (itemType) => {
    return itemType.startsWith('collection-item');
  };

  const [{ isDragging }, drag] = useDrag({
    type: "collection",
    item: collection,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    options: {
      dropEffect: "move"
    }
  });
  
  const [{ isOver, canDrop }, drop] = useDrop({
    accept: `COLLECTION_ITEM_${collection.uid}`,
    hover: (draggedItem, monitor) => {
      const hoverBoundingRect = collectionRef.current?.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();
      
      if (hoverBoundingRect && clientOffset) {
        const hoverY = clientOffset.y - hoverBoundingRect.top;
        // Show drop target styling for the entire collection name area
        setIsDropTarget(true);
        // Set drop position based on hover location
        if (hoverY < hoverBoundingRect.height / 2) {
          setDropPosition('above');
        } else {
          setDropPosition('below');
        }
      }
    },
    drop: (draggedItem, monitor) => {
      const hoverBoundingRect = collectionRef.current?.getBoundingClientRect();
      const clientOffset = monitor.getClientOffset();
      
      if (hoverBoundingRect && clientOffset) {
        const hoverY = clientOffset.y - hoverBoundingRect.top;
        if (hoverY < hoverBoundingRect.height) {
          dispatch(moveItemToRootOfCollection(collection.uid, draggedItem.uid));
        }
      }
      setIsDropTarget(false);
      setDropPosition(null);
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop()
    })
  });

  drag(drop(collectionRef));

  // Clean up drop target state when drag ends
  useEffect(() => {
    if (!isOver) {
      setIsDropTarget(false);
    }
  }, [isOver]);

  const collectionRowClassName = classnames('flex py-1 collection-name items-center', {
    'drop-target': isDropTarget && isOver,
    'drop-target-above': isOver && dropPosition === 'above',
    'drop-target-below': isOver && dropPosition === 'below'
  });

  if (searchText && searchText.length) {
    if (!doesCollectionHaveItemsMatchingSearchText(collection, searchText)) {
      return null;
    }
  }

  // we need to sort request items by seq property
  const sortItemsBySequence = (items = []) => {
    return items.sort((a, b) => a.seq - b.seq);
  };

  const folderItems = sortItemsBySequence(filter(collection.items, (i) => isItemAFolder(i)));
  const requestItems = sortItemsBySequence(filter(collection.items, (i) => isItemARequest(i)));

  return (
    <StyledWrapper className="flex flex-col">
      {showNewRequestModal && <NewRequest collectionUid={collection.uid} onClose={() => setShowNewRequestModal(false)} />}
      {showNewFolderModal && <NewFolder collectionUid={collection.uid} onClose={() => setShowNewFolderModal(false)} />}
      {showRenameCollectionModal && (
        <RenameCollection collectionUid={collection.uid} onClose={() => setShowRenameCollectionModal(false)} />
      )}
      {showRemoveCollectionModal && (
        <RemoveCollection collectionUid={collection.uid} onClose={() => setShowRemoveCollectionModal(false)} />
      )}
      {showShareCollectionModal && (
        <ShareCollection collectionUid={collection.uid} onClose={() => setShowShareCollectionModal(false)} />
      )}
      {showCloneCollectionModalOpen && (
        <CloneCollection collectionUid={collection.uid} onClose={() => setShowCloneCollectionModalOpen(false)} />
      )}
      <div 
        className={collectionRowClassName} 
        ref={(node) => {
          collectionRef.current = node;
          drop(node);
        }}
      >
        <div
          className="flex flex-grow items-center overflow-hidden"
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleRightClick}
        >
          <IconChevronRight
            size={16}
            strokeWidth={2}
            className={`chevron-icon ${iconClassName}`}
            style={{ width: 16, minWidth: 16, color: 'rgb(160 160 160)' }}
            onClick={handleCollectionCollapse}
          />
          <div className="ml-1 w-full" id="sidebar-collection-name">
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
                setShowShareCollectionModal(true);
              }}
            >
              Share
            </div>
            <div
              className="dropdown-item"
              onClick={(e) => {
                menuDropdownTippyRef.current.hide();
                setShowRemoveCollectionModal(true);
              }}
            >
              Close
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
            {folderItems?.map?.((i) => {
              return <CollectionItem key={i.uid} item={i} collectionUid={collection.uid} searchText={searchText} />;
            })}
            {requestItems?.map?.((i) => {
              return <CollectionItem key={i.uid} item={i} collectionUid={collection.uid} searchText={searchText} />;
            })}
          </div>
        ) : null}
      </div>
    </StyledWrapper>
  );
};

export default Collection;
