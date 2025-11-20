import React, { useState, forwardRef, useRef, useEffect } from 'react';
import { getEmptyImage } from 'react-dnd-html5-backend';
import classnames from 'classnames';
import { uuid } from 'utils/common';
import filter from 'lodash/filter';
import { useDrop, useDrag } from 'react-dnd';
import { IconChevronRight, IconDots, IconLoader2, IconSettings, IconBox, IconPlus } from '@tabler/icons';
import ToolHint from 'components/ToolHint';
import Dropdown from 'components/Dropdown';
import { toggleCollection, collapseFullCollection } from 'providers/ReduxStore/slices/collections';
import { mountCollection, moveCollectionAndPersist, handleCollectionItemDrop, pasteItem } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch, useSelector } from 'react-redux';
import { hideHomePage } from 'providers/ReduxStore/slices/app';
import { addTab, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import toast from 'react-hot-toast';
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
  const [dropType, setDropType] = useState(null);
  const dispatch = useDispatch();
  const isLoading = areItemsLoading(collection);
  const collectionRef = useRef(null);

  const isCollectionFocused = useSelector(isTabForItemActive({ itemUid: collection.uid }));
  const { hasCopiedItems } = useSelector((state) => state.app.clipboard);
  const menuDropdownTippyRef = useRef();
  const onMenuDropdownCreate = (ref) => (menuDropdownTippyRef.current = ref);
  const MenuIcon = forwardRef((_props, ref) => {
    return (
      <div ref={ref} className="menu-icon-trigger mr-1" onClick={(e) => e.stopPropagation()}>
        <IconDots size={18} />
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
    if(collection.mountStatus === 'mounted'){
      return;
    }
    dispatch(mountCollection({
      collectionUid: collection.uid,
      collectionPathname: collection.pathname,
      brunoConfig: collection.brunoConfig
    }));
  }

  const hasSearchText = searchText && searchText?.trim()?.length;
  const collectionIsCollapsed = hasSearchText ? false : collection.collapsed;

  const iconClassName = classnames({
    'rotate-90': !collectionIsCollapsed
  });

  const handleClick = (event) => {
    if (event.detail != 1) return;
    setTimeout(scrollToTheActiveTab, 50);

    ensureCollectionIsMounted();
    dispatch(toggleCollection(collection.uid));
  };

  const handleSettingsClick = (e) => {
    e.stopPropagation();
    dispatch(hideHomePage()); // @TODO Playwright tests are often stuck on home page, rather than collection settings tab. Revisit for a proper fix.
    dispatch(addTab({
      uid: collection.uid,
      collectionUid: collection.uid,
      type: 'collection-settings'
    }));
  };

  const handleDoubleClick = (_event) => {
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

  const handleRightClick = (_event) => {
    const _menuDropdown = menuDropdownTippyRef.current;
    if (_menuDropdown) {
      let menuDropdownBehavior = 'show';
      if (_menuDropdown.state.isShown) {
        menuDropdownBehavior = 'hide';
      }
      _menuDropdown[menuDropdownBehavior]();
    }
  };

  const handleCollapseFullCollection = () => {
    dispatch(collapseFullCollection({ collectionUid: collection.uid }));
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

  const handlePasteRequest = () => {
    menuDropdownTippyRef.current.hide();
    dispatch(pasteItem(collection.uid, null))
      .then(() => {
        toast.success('Request pasted successfully');
      })
      .catch((err) => {
        toast.error(err ? err.message : 'An error occurred while pasting the request');
      });
  };

  const isCollectionItem = (itemType) => {
    return itemType === 'collection-item';
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
    accept: ['collection', 'collection-item'],
    hover: (_draggedItem, monitor) => {
      const itemType = monitor.getItemType();
      if (isCollectionItem(itemType)) {
        // For collection items, always show full highlight (inside drop)
        setDropType('inside');
      } else {
        // For collections, show line indicator (adjacent drop)
        setDropType('adjacent');
      }
    },
    drop: (draggedItem, monitor) => {
      const itemType = monitor.getItemType();
      if (isCollectionItem(itemType)) {
        dispatch(handleCollectionItemDrop({ targetItem: collection, draggedItem, dropType: 'inside', collectionUid: collection.uid }))
      } else {
        dispatch(moveCollectionAndPersist({draggedItem, targetItem: collection}));
      }
      setDropType(null);
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
    'item-hovered': isOver && dropType === 'adjacent', // For collection-to-collection moves (show line)
    'drop-target': isOver && dropType === 'inside', // For collection-item drops (highlight full area)
    'collection-focused-in-tab': isCollectionFocused
  });

  // we need to sort request items by seq property
  const sortItemsBySequence = (items = []) => {
    return items.sort((a, b) => a.seq - b.seq);
  };

  const requestItems = sortItemsBySequence(filter(collection.items, (i) => isItemARequest(i)));
  const folderItems = sortByNameThenSequence(filter(collection.items, (i) => isItemAFolder(i)));

  return (
    <StyledWrapper className="flex flex-col" id={`collection-${collection.name.replace(/\s+/g, '-').toLowerCase()}`}>
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
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleRightClick}
      >
        <div
          className="flex flex-grow items-center overflow-hidden"
        >
          <IconChevronRight
            size={16}
            strokeWidth={2}
            className={`chevron-icon ${iconClassName}`}
            style={{ width: 16, minWidth: 16, color: 'rgb(160 160 160)' }}
          />
          <div className="flex items-center">
            <IconBox size={18} strokeWidth={1.5} className="mr-1 text-gray-500" />
          </div>
          <div className="ml-1 w-full" id="sidebar-collection-name" title={collection.name}>
            {collection.name}
          </div>
          {isLoading ? <IconLoader2 className="animate-spin mx-1" size={18} strokeWidth={1.5} /> : null}
        </div>
        <div className="collection-actions flex items-center" data-testid="collection-actions">
          <ToolHint text="New Request" toolhintId={`new-request-${collection.uid}`} place="bottom" delayShow={800}>
            <div
              className="new-request-icon mr-1"
              onClick={(e) => {
                e.stopPropagation();
                setShowNewRequestModal(true);
              }}
            >
              <IconPlus size={18} strokeWidth={1.5} />
            </div>
          </ToolHint>
          <ToolHint text="Collection Settings" toolhintId={`settings-${collection.uid}`} place="bottom" delayShow={800}>
            <div className="settings-icon mr-1" onClick={handleSettingsClick}>
              <IconSettings size={18} strokeWidth={1.5} />
            </div>
          </ToolHint>
          <ToolHint text="More options" toolhintId={`menu-${collection.uid}`} place="bottom" delayShow={800}>
            <Dropdown onCreate={onMenuDropdownCreate} icon={<MenuIcon />} placement="bottom-start">
              <div
                className="dropdown-item"
                onClick={(_e) => {
                  menuDropdownTippyRef.current.hide();
                  setShowNewRequestModal(true);
                }}
              >
                New Request
              </div>
              <div
                className="dropdown-item"
                onClick={(_e) => {
                  menuDropdownTippyRef.current.hide();
                  setShowNewFolderModal(true);
                }}
              >
                New Folder
              </div>
              <div
                className="dropdown-item"
                data-testid="clone-collection"
                onClick={(_e) => {
                  menuDropdownTippyRef.current.hide();
                  setShowCloneCollectionModalOpen(true);
                }}
              >
                Clone
              </div>
              {hasCopiedItems && (
                <div
                  className="dropdown-item"
                  onClick={handlePasteRequest}
                >
                  Paste
                </div>
              )}
              <div
                className="dropdown-item"
                onClick={(_e) => {
                  menuDropdownTippyRef.current.hide();
                  ensureCollectionIsMounted();
                  handleRun();
                }}
              >
                Run
              </div>
              <div
                className="dropdown-item"
                onClick={(_e) => {
                  menuDropdownTippyRef.current.hide();
                  setShowRenameCollectionModal(true);
                }}
              >
                Rename
              </div>
              <div
                className="dropdown-item"
                onClick={(_e) => {
                  menuDropdownTippyRef.current.hide();
                  ensureCollectionIsMounted();
                  setShowShareCollectionModal(true);
                }}
              >
                Share
              </div>
              <div
                className="dropdown-item"
                onClick={(_e) => {
                  menuDropdownTippyRef.current.hide();
                  handleCollapseFullCollection();
                }}
              >
                Collapse
              </div>
              <div
                className="dropdown-item"
                onClick={(_e) => {
                  menuDropdownTippyRef.current.hide();
                  setShowRemoveCollectionModal(true);
                }}
              >
                Close
              </div>
              <div
                className="dropdown-item"
                onClick={(_e) => {
                  menuDropdownTippyRef.current.hide();
                  viewCollectionSettings();
                }}
              >
                Settings
              </div>
            </Dropdown>
          </ToolHint>
        </div>
      </div>
      <div className={`transition-container ${collectionIsCollapsed ? 'collapsed' : ''}`}>
        <div className="transition-inner">
          {folderItems?.map?.((i) => {
            return <CollectionItem key={i.uid} item={i} collectionUid={collection.uid} collectionPathname={collection.pathname} searchText={searchText} />;
          })}
          {requestItems?.map?.((i) => {
            return <CollectionItem key={i.uid} item={i} collectionUid={collection.uid} collectionPathname={collection.pathname} searchText={searchText} />;
          })}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default Collection;
