import React, { useState, forwardRef, useRef, useEffect } from 'react';
import { getEmptyImage } from 'react-dnd-html5-backend';
import classnames from 'classnames';
import { uuid } from 'utils/common';
import filter from 'lodash/filter';
import { useDrop, useDrag } from 'react-dnd';
import { IconChevronRight, IconDots, IconLoader2 } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import { toggleCollection } from 'providers/ReduxStore/slices/collections';
import { mountCollection, moveCollectionAndPersist, handleCollectionItemDrop } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch, useSelector } from 'react-redux';
import { addTab, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import NewRequest from 'components/Sidebar/NewRequest';
import NewFolder from 'components/Sidebar/NewFolder';
import CollectionItem from './CollectionItem';
import RemoveCollection from './RemoveCollection';
import { doesCollectionHaveItemsMatchingSearchText } from 'utils/collections/search';
import { isItemAFolder, isItemARequest } from 'utils/collections';
import { isTabForItemActive } from 'src/selectors/tab';

import RenameCollection from './RenameCollection';
import StyledWrapper from './StyledWrapper';
import CloneCollection from './CloneCollection';
import { areItemsLoading } from 'utils/collections';
import { scrollToTheActiveTab } from 'utils/tabs';
import ShareCollection from 'components/ShareCollection/index';
import { CollectionItemDragPreview } from './CollectionItem/CollectionItemDragPreview/index';
import { sortByNameThenSequence } from 'utils/common/index';

const Collection = ({ collection, searchText }) => {
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showRenameCollectionModal, setShowRenameCollectionModal] = useState(false);
  const [showCloneCollectionModalOpen, setShowCloneCollectionModalOpen] = useState(false);
  const [showShareCollectionModal, setShowShareCollectionModal] = useState(false);
  const [showRemoveCollectionModal, setShowRemoveCollectionModal] = useState(false);
  const dispatch = useDispatch();
  const isLoading = areItemsLoading(collection);
  const collectionRef = useRef(null);
  
  const isCollectionFocused = useSelector(isTabForItemActive({ itemUid: collection.uid }));
  
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
  const collectionIsCollapsed = hasSearchText ? false : collection.collapsed;

  const iconClassName = classnames({
    'rotate-90': !collectionIsCollapsed
  });

  const handleClick = (event) => {
    if (event.detail != 1) return;
    // Check if the click came from the chevron icon
    const isChevronClick = event.target.closest('svg')?.classList.contains('chevron-icon');
    setTimeout(scrollToTheActiveTab, 50);
    
    ensureCollectionIsMounted();

    if(collection.collapsed) {
      dispatch(toggleCollection(collection.uid));
    }
  
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
    dispatch(toggleCollection(collection.uid));
  }

  // prevent the parent's double-click handler from firing
  const handleCollectionDoubleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
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
        uid: collection.uid,
        collectionUid: collection.uid,
        type: 'collection-settings'
      })
    );
  };

  const isCollectionItem = (itemType) => {
    return itemType.startsWith('collection-item');
  };

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: "collection",
    item: collection,
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    options: {
      dropEffect: "move"
    }
  });
  
  const [{ isOver }, drop] = useDrop({
    accept: ["collection", `collection-item-${collection.uid}`],
    drop: (draggedItem, monitor) => {
      const itemType = monitor.getItemType();
      if (isCollectionItem(itemType)) {
        dispatch(handleCollectionItemDrop({ targetItem: collection, draggedItem, dropType: 'inside', collectionUid: collection.uid }))
      } else {
        dispatch(moveCollectionAndPersist({draggedItem, targetItem: collection}));
      }
    },
    canDrop: (draggedItem) => {
      return draggedItem.uid !== collection.uid;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
  });

  useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, []);

  if (searchText && searchText.length) {
    if (!doesCollectionHaveItemsMatchingSearchText(collection, searchText)) {
      return null;
    }
  }

  const collectionRowClassName = classnames('flex py-1 collection-name items-center', {
      'item-hovered': isOver,
      'collection-focused-in-tab': isCollectionFocused
    });

  // we need to sort request items by seq property
  const sortItemsBySequence = (items = []) => {
    return items.sort((a, b) => a.seq - b.seq);
  };

  const requestItems = sortItemsBySequence(filter(collection.items, (i) => isItemARequest(i)));
  const folderItems = sortByNameThenSequence(filter(collection.items, (i) => isItemAFolder(i)));

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
      <CollectionItemDragPreview />
      <div className={collectionRowClassName}
        ref={(node) => {
          collectionRef.current = node;
          drag(drop(node));
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
            onDoubleClick={handleCollectionDoubleClick}
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
              return <CollectionItem key={i.uid} item={i} collectionUid={collection.uid} collectionPathname={collection.pathname} searchText={searchText} />;
            })}
            {requestItems?.map?.((i) => {
              return <CollectionItem key={i.uid} item={i} collectionUid={collection.uid} collectionPathname={collection.pathname} searchText={searchText} />;
            })}
          </div>
        ) : null}
      </div>
    </StyledWrapper>
  );
};

export default Collection;
