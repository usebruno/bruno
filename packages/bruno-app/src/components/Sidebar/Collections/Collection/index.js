import React, { useState, useRef, useEffect } from 'react';
import { getEmptyImage } from 'react-dnd-html5-backend';
import classnames from 'classnames';
import { uuid } from 'utils/common';
import filter from 'lodash/filter';
import { useDrop, useDrag } from 'react-dnd';
import {
  IconChevronRight,
  IconDots,
  IconLoader2,
  IconFilePlus,
  IconFolderPlus,
  IconCopy,
  IconClipboard,
  IconPlayerPlay,
  IconEdit,
  IconShare,
  IconFoldDown,
  IconX,
  IconSettings,
  IconTerminal2,
  IconFolder,
  IconBook
} from '@tabler/icons';
import { toggleCollection, collapseFullCollection } from 'providers/ReduxStore/slices/collections';
import { mountCollection, moveCollectionAndPersist, handleCollectionItemDrop, pasteItem, showInFolder, saveCollectionSecurityConfig } from 'providers/ReduxStore/slices/collections/actions';
import { useDispatch, useSelector } from 'react-redux';
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
import GenerateDocumentation from './GenerateDocumentation';
import { CollectionItemDragPreview } from './CollectionItem/CollectionItemDragPreview/index';
import { sortByNameThenSequence } from 'utils/common/index';
import { getRevealInFolderLabel } from 'utils/common/platform';
import { openDevtoolsAndSwitchToTerminal } from 'utils/terminal';
import ActionIcon from 'ui/ActionIcon';
import MenuDropdown from 'ui/MenuDropdown';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';

const Collection = ({ collection, searchText }) => {
  const { dropdownContainerRef } = useSidebarAccordion();
  const [showNewFolderModal, setShowNewFolderModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showRenameCollectionModal, setShowRenameCollectionModal] = useState(false);
  const [showCloneCollectionModalOpen, setShowCloneCollectionModalOpen] = useState(false);
  const [showShareCollectionModal, setShowShareCollectionModal] = useState(false);
  const [showGenerateDocumentationModal, setShowGenerateDocumentationModal] = useState(false);
  const [showRemoveCollectionModal, setShowRemoveCollectionModal] = useState(false);
  const [dropType, setDropType] = useState(null);
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);
  const dispatch = useDispatch();
  const isLoading = areItemsLoading(collection);
  const collectionRef = useRef(null);

  const isCollectionFocused = useSelector(isTabForItemActive({ itemUid: collection.uid }));
  const { hasCopiedItems } = useSelector((state) => state.app.clipboard);
  const menuDropdownRef = useRef(null);

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
    if (collection.mountStatus === 'mounted') {
      return;
    }
    dispatch(mountCollection({
      collectionUid: collection.uid,
      collectionPathname: collection.pathname,
      brunoConfig: collection.brunoConfig
    }));
  };

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

    if (collection.collapsed) {
      dispatch(toggleCollection(collection.uid));
      // Set default jsSandboxMode to 'safe' if not present and save to disk
      if (!collection.securityConfig?.jsSandboxMode) {
        dispatch(saveCollectionSecurityConfig(collection.uid, {
          jsSandboxMode: 'safe'
        }));
      }
    }

    if (!isChevronClick) {
      dispatch(
        addTab({
          uid: collection.uid,
          collectionUid: collection.uid,
          type: 'collection-settings'
        })
      );
    }
  };

  const handleDoubleClick = (_event) => {
    dispatch(makeTabPermanent({ uid: collection.uid }));
  };

  const handleCollectionCollapse = (e) => {
    e.stopPropagation();
    e.preventDefault();
    ensureCollectionIsMounted();
    dispatch(toggleCollection(collection.uid));
  };

  // prevent the parent's double-click handler from firing
  const handleCollectionDoubleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleRightClick = (event) => {
    event.preventDefault();
    menuDropdownRef.current?.show();
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

  const handleShowInFolder = () => {
    dispatch(showInFolder(collection.pathname)).catch((error) => {
      console.error('Error opening the folder', error);
      toast.error('Error opening the folder');
    });
  };

  const handlePasteItem = () => {
    dispatch(pasteItem(collection.uid, null))
      .then(() => {
        toast.success('Item pasted successfully');
      })
      .catch((err) => {
        toast.error(err ? err.message : 'An error occurred while pasting the item');
      });
  };

  // Keyboard shortcuts handler for collection
  const handleKeyDown = (e) => {
    // Detect Mac by checking both metaKey and platform
    const isMac = navigator.userAgent?.includes('Mac') || navigator.platform?.startsWith('Mac');
    const isModifierPressed = isMac ? e.metaKey : e.ctrlKey;

    if (isModifierPressed && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      e.stopPropagation();
      handlePasteItem();
    }
  };

  const handleFocus = () => {
    setIsKeyboardFocused(true);
  };

  const handleBlur = () => {
    setIsKeyboardFocused(false);
  };

  const isCollectionItem = (itemType) => {
    return itemType === 'collection-item';
  };

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: 'collection',
    item: collection,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    options: {
      dropEffect: 'move'
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
        dispatch(handleCollectionItemDrop({ targetItem: collection, draggedItem, dropType: 'inside', collectionUid: collection.uid }));
      } else {
        dispatch(moveCollectionAndPersist({ draggedItem, targetItem: collection }));
      }
      setDropType(null);
    },
    canDrop: (draggedItem) => {
      return draggedItem.uid !== collection.uid;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, []);

  useEffect(() => {
    if (isCollectionFocused && collectionRef.current) {
      try {
        collectionRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (err) {
        // ignore scroll errors
      }
    }
  }, [isCollectionFocused]);

  if (searchText && searchText.length) {
    if (!doesCollectionHaveItemsMatchingSearchText(collection, searchText)) {
      return null;
    }
  }

  const collectionRowClassName = classnames('flex py-1 collection-name items-center', {
    'item-hovered': isOver && dropType === 'adjacent', // For collection-to-collection moves (show line)
    'drop-target': isOver && dropType === 'inside', // For collection-item drops (highlight full area)
    'collection-focused-in-tab': isCollectionFocused && !isKeyboardFocused,
    'collection-keyboard-focused': isKeyboardFocused
  });

  // we need to sort request items by seq property
  const sortItemsBySequence = (items = []) => {
    return items.sort((a, b) => a.seq - b.seq);
  };

  const requestItems = sortItemsBySequence(filter(collection.items, (i) => isItemARequest(i) && !i.isTransient));
  const folderItems = sortByNameThenSequence(filter(collection.items, (i) => isItemAFolder(i) && !i.isTransient));

  const menuItems = [
    {
      id: 'new-request',
      leftSection: IconFilePlus,
      label: 'New Request',
      onClick: () => {
        ensureCollectionIsMounted();
        setShowNewRequestModal(true);
      }
    },
    {
      id: 'new-folder',
      leftSection: IconFolderPlus,
      label: 'New Folder',
      onClick: () => {
        ensureCollectionIsMounted();
        setShowNewFolderModal(true);
      }
    },
    {
      id: 'run',
      leftSection: IconPlayerPlay,
      label: 'Run',
      onClick: () => {
        ensureCollectionIsMounted();
        handleRun();
      }
    },
    {
      id: 'clone',
      leftSection: IconCopy,
      label: 'Clone',
      testId: 'clone-collection',
      onClick: () => {
        setShowCloneCollectionModalOpen(true);
      }
    },
    ...(hasCopiedItems
      ? [
          {
            id: 'paste',
            leftSection: IconClipboard,
            label: 'Paste',
            onClick: handlePasteItem
          }
        ]
      : []),
    {
      id: 'rename',
      leftSection: IconEdit,
      label: 'Rename',
      onClick: () => {
        setShowRenameCollectionModal(true);
      }
    },
    {
      id: 'share',
      leftSection: IconShare,
      label: 'Share',
      onClick: () => {
        ensureCollectionIsMounted();
        setShowShareCollectionModal(true);
      }
    },
    {
      id: 'generate-docs',
      leftSection: IconBook,
      label: 'Generate Docs',
      onClick: () => {
        ensureCollectionIsMounted();
        setShowGenerateDocumentationModal(true);
      }
    },
    {
      id: 'collapse',
      leftSection: IconFoldDown,
      label: 'Collapse',
      onClick: handleCollapseFullCollection
    },
    {
      id: 'show-in-folder',
      leftSection: IconFolder,
      label: getRevealInFolderLabel(),
      onClick: handleShowInFolder
    },
    {
      id: 'divider-1',
      type: 'divider'
    },
    {
      id: 'settings',
      leftSection: IconSettings,
      label: 'Settings',
      onClick: viewCollectionSettings
    },
    {
      id: 'terminal',
      leftSection: IconTerminal2,
      label: 'Open in Terminal',
      onClick: async () => {
        const collectionCwd = collection.pathname;
        await openDevtoolsAndSwitchToTerminal(dispatch, collectionCwd);
      }
    },
    {
      id: 'remove',
      leftSection: IconX,
      label: 'Remove',
      onClick: () => {
        setShowRemoveCollectionModal(true);
      }
    }
  ];

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
      {showGenerateDocumentationModal && (
        <GenerateDocumentation collectionUid={collection.uid} onClose={() => setShowGenerateDocumentationModal(false)} />
      )}
      {showCloneCollectionModalOpen && (
        <CloneCollection collectionUid={collection.uid} onClose={() => setShowCloneCollectionModalOpen(false)} />
      )}
      <CollectionItemDragPreview />
      <div
        className={collectionRowClassName}
        ref={(node) => {
          collectionRef.current = node;
          drag(drop(node));
        }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        data-testid="sidebar-collection-row"
      >
        <div
          className="flex flex-grow items-center overflow-hidden"
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onContextMenu={handleRightClick}
        >
          <ActionIcon style={{ width: 16, minWidth: 16 }}>
            <IconChevronRight
              size={16}
              strokeWidth={2}
              className={`chevron-icon ${iconClassName}`}
              style={{ width: 16, minWidth: 16, color: 'rgb(160 160 160)' }}
              onClick={handleCollectionCollapse}
              onDoubleClick={handleCollectionDoubleClick}
            />
          </ActionIcon>
          <div className="ml-1 w-full" id="sidebar-collection-name" title={collection.name}>
            {collection.name}
          </div>
          {isLoading ? <IconLoader2 className="animate-spin mx-1" size={18} strokeWidth={1.5} /> : null}
        </div>
        <div>
          <div className="pr-2">
            <MenuDropdown
              ref={menuDropdownRef}
              items={menuItems}
              placement="bottom-start"
              appendTo={dropdownContainerRef?.current || document.body}
              popperOptions={{ strategy: 'fixed' }}
              data-testid="collection-actions"
            >
              <ActionIcon className="collection-actions">
                <IconDots size={18} />
              </ActionIcon>
            </MenuDropdown>
          </div>
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
