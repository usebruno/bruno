import React, { useState, useRef, useEffect } from 'react';
import { getEmptyImage } from 'react-dnd-html5-backend';
import range from 'lodash/range';
import filter from 'lodash/filter';
import classnames from 'classnames';
import { useDrag, useDrop } from 'react-dnd';
import {
  IconChevronRight,
  IconDots,
  IconFilePlus,
  IconFolderPlus,
  IconPlayerPlay,
  IconEdit,
  IconCopy,
  IconClipboard,
  IconCode,
  IconFolder,
  IconTrash,
  IconSettings,
  IconInfoCircle,
  IconTerminal2
} from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { addTab, focusTab, makeTabPermanent } from 'providers/ReduxStore/slices/tabs';
import { handleCollectionItemDrop, sendRequest, showInFolder, pasteItem, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { toggleCollectionItem, addResponseExample } from 'providers/ReduxStore/slices/collections';
import { insertTaskIntoQueue } from 'providers/ReduxStore/slices/app';
import { uuid } from 'utils/common';
import { copyRequest } from 'providers/ReduxStore/slices/app';
import NewRequest from 'components/Sidebar/NewRequest';
import NewFolder from 'components/Sidebar/NewFolder';
import RenameCollectionItem from './RenameCollectionItem';
import CloneCollectionItem from './CloneCollectionItem';
import DeleteCollectionItem from './DeleteCollectionItem';
import RunCollectionItem from './RunCollectionItem';
import GenerateCodeItem from './GenerateCodeItem';
import { isItemARequest, isItemAFolder } from 'utils/tabs';
import { doesRequestMatchSearchText, doesFolderHaveItemsMatchSearchText } from 'utils/collections/search';
import { getDefaultRequestPaneTab } from 'utils/collections';
import toast from 'react-hot-toast';
import StyledWrapper from './StyledWrapper';
import NetworkError from 'components/ResponsePane/NetworkError/index';
import CollectionItemInfo from './CollectionItemInfo/index';
import CollectionItemIcon from './CollectionItemIcon';
import ExampleItem from './ExampleItem';
import ExampleIcon from 'components/Icons/ExampleIcon';
import { scrollToTheActiveTab } from 'utils/tabs';
import { isTabForItemActive as isTabForItemActiveSelector, isTabForItemPresent as isTabForItemPresentSelector } from 'src/selectors/tab';
import { isEqual } from 'lodash';
import { calculateDraggedItemNewPathname, getInitialExampleName, findParentItemInCollection } from 'utils/collections/index';
import { sortByNameThenSequence } from 'utils/common/index';
import { getRevealInFolderLabel } from 'utils/common/platform';
import CreateExampleModal from 'components/ResponseExample/CreateExampleModal';
import { openDevtoolsAndSwitchToTerminal } from 'utils/terminal';
import ActionIcon from 'ui/ActionIcon';
import MenuDropdown from 'ui/MenuDropdown';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';

const CollectionItem = ({ item, collectionUid, collectionPathname, searchText }) => {
  const { dropdownContainerRef } = useSidebarAccordion();
  const _isTabForItemActiveSelector = isTabForItemActiveSelector({ itemUid: item.uid });
  const isTabForItemActive = useSelector(_isTabForItemActiveSelector, isEqual);

  const _isTabForItemPresentSelector = isTabForItemPresentSelector({ itemUid: item.uid });
  const isTabForItemPresent = useSelector(_isTabForItemPresentSelector, isEqual);

  const isSidebarDragging = useSelector((state) => state.app.isDragging);
  const collection = useSelector((state) => state.collections.collections?.find((c) => c.uid === collectionUid));
  const { hasCopiedItems } = useSelector((state) => state.app.clipboard);
  const dispatch = useDispatch();

  // We use a single ref for drag and drop.
  const ref = useRef(null);
  const menuDropdownRef = useRef(null);

  const [renameItemModalOpen, setRenameItemModalOpen] = useState(false);
  const [cloneItemModalOpen, setCloneItemModalOpen] = useState(false);
  const [deleteItemModalOpen, setDeleteItemModalOpen] = useState(false);
  const [createExampleModalOpen, setCreateExampleModalOpen] = useState(false);
  const [generateCodeItemModalOpen, setGenerateCodeItemModalOpen] = useState(false);
  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [runCollectionModalOpen, setRunCollectionModalOpen] = useState(false);
  const [itemInfoModalOpen, setItemInfoModalOpen] = useState(false);
  const [examplesExpanded, setExamplesExpanded] = useState(false);
  const [isKeyboardFocused, setIsKeyboardFocused] = useState(false);
  const hasSearchText = searchText && searchText?.trim()?.length;
  const itemIsCollapsed = hasSearchText ? false : item.collapsed;
  const isFolder = isItemAFolder(item);

  // Check if request has examples (only for HTTP requests)
  const hasExamples = isItemARequest(item) && item.type === 'http-request' && item.examples && item.examples.length > 0;

  const [dropType, setDropType] = useState(null); // 'adjacent' or 'inside'

  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: 'collection-item',
    item: { ...item, sourceCollectionUid: collectionUid },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    }),
    options: {
      dropEffect: 'move'
    }
  });

  useEffect(() => {
    dragPreview(getEmptyImage(), { captureDraggingState: true });
  }, []);

  // Auto-scroll to show this item when its tab becomes active
  useEffect(() => {
    if (isTabForItemActive && ref.current) {
      try {
        ref.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch (err) {
        // ignore scroll errors (some environments may not support smooth scrolling)
      }
    }
  }, [isTabForItemActive]);

  const determineDropType = (monitor) => {
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

  const canItemBeDropped = ({ draggedItem, targetItem, dropType }) => {
    const { uid: targetItemUid, pathname: targetItemPathname } = targetItem;
    const { uid: draggedItemUid, pathname: draggedItemPathname, sourceCollectionUid } = draggedItem;

    if (draggedItemUid === targetItemUid) return false;

    // For cross-collection moves, we allow the drop
    if (sourceCollectionUid !== collectionUid) {
      return true;
    }

    const newPathname = calculateDraggedItemNewPathname({ draggedItem, targetItem, dropType, collectionPathname });
    if (!newPathname) return false;

    if (targetItemPathname?.startsWith(draggedItemPathname)) return false;

    return true;
  };

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: 'collection-item',
    hover: (draggedItem, monitor) => {
      const { uid: targetItemUid } = item;
      const { uid: draggedItemUid } = draggedItem;

      if (draggedItemUid === targetItemUid) return;

      const dropType = determineDropType(monitor);

      const _canItemBeDropped = canItemBeDropped({ draggedItem, targetItem: item, dropType });

      setDropType(_canItemBeDropped ? dropType : null);
    },
    drop: async (draggedItem, monitor) => {
      const { uid: targetItemUid } = item;
      const { uid: draggedItemUid } = draggedItem;

      if (draggedItemUid === targetItemUid) return;

      const dropType = determineDropType(monitor);
      if (!dropType) return;

      await dispatch(handleCollectionItemDrop({ targetItem: item, draggedItem, dropType, collectionUid }));
      setDropType(null);
    },
    canDrop: (draggedItem) => draggedItem.uid !== item.uid,
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  const iconClassName = classnames({
    'rotate-90': !itemIsCollapsed
  });

  const examplesIconClassName = classnames({
    'rotate-90': examplesExpanded
  });

  const itemRowClassName = classnames('flex collection-item-name relative items-center', {
    'item-focused-in-tab': isTabForItemActive,
    'item-hovered': isOver && canDrop,
    'drop-target': isOver && dropType === 'inside',
    'drop-target-above': isOver && dropType === 'adjacent',
    'item-keyboard-focused': isKeyboardFocused
  });

  const handleRun = async () => {
    dispatch(sendRequest(item, collectionUid)).catch((err) =>
      toast.custom((t) => <NetworkError onClose={() => toast.dismiss(t.id)} />, {
        duration: 5000
      })
    );
  };

  const handleClick = (event) => {
    if (event && event.detail != 1) return;
    // scroll to the active tab
    setTimeout(scrollToTheActiveTab, 50);
    const isRequest = isItemARequest(item);
    if (isRequest) {
      if (isTabForItemPresent) {
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
          collectionUid: collectionUid,
          requestPaneTab: getDefaultRequestPaneTab(item),
          type: 'request'
        })
      );
    } else {
      dispatch(
        addTab({
          uid: item.uid,
          collectionUid: collectionUid,
          type: 'folder-settings'
        })
      );
      if (item.collapsed) {
        dispatch(
          toggleCollectionItem({
            itemUid: item.uid,
            collectionUid: collectionUid
          })
        );
      }
    }
  };

  const handleFolderCollapse = (e) => {
    e.stopPropagation();
    e.preventDefault();
    dispatch(
      toggleCollectionItem({
        itemUid: item.uid,
        collectionUid: collectionUid
      })
    );
  };

  // prevent the parent's double-click handler from firing
  const handleFolderDoubleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  const handleExamplesCollapse = (e) => {
    e.stopPropagation();
    e.preventDefault();
    setExamplesExpanded(!examplesExpanded);
  };

  // prevent the parent's double-click handler from firing
  const handleExamplesDoubleClick = (e) => {
    e.stopPropagation();
    e.preventDefault();
  };

  // Handle right-click context menu
  const handleContextMenu = (e) => {
    e.preventDefault();
    e.stopPropagation();
    menuDropdownRef.current?.show();
  };

  let indents = range(item.depth);

  // Build menu items for MenuDropdown
  const buildMenuItems = () => {
    const items = [];

    if (isFolder) {
      items.push(
        {
          id: 'new-request',
          leftSection: IconFilePlus,
          label: 'New Request',
          onClick: () => setNewRequestModalOpen(true)
        },
        {
          id: 'new-folder',
          leftSection: IconFolderPlus,
          label: 'New Folder',
          onClick: () => setNewFolderModalOpen(true)
        },
        {
          id: 'run',
          leftSection: IconPlayerPlay,
          label: 'Run',
          onClick: () => setRunCollectionModalOpen(true)
        }
      );
    }

    items.push(
      {
        id: 'clone',
        leftSection: IconCopy,
        label: 'Clone',
        onClick: () => setCloneItemModalOpen(true)
      },
      {
        id: 'copy',
        leftSection: IconCopy,
        label: 'Copy',
        onClick: handleCopyItem
      }
    );

    if (isFolder && hasCopiedItems) {
      items.push({
        id: 'paste',
        leftSection: IconClipboard,
        label: 'Paste',
        onClick: handlePasteItem
      });
    }

    items.push(
      {
        id: 'rename',
        leftSection: IconEdit,
        label: 'Rename',
        onClick: () => setRenameItemModalOpen(true)
      }
    );
    if (!isFolder && isItemARequest(item) && !(item.type === 'http-request' || item.type === 'graphql-request')) {
      items.push({
        id: 'run',
        leftSection: IconPlayerPlay,
        label: 'Run',
        onClick: () => {
          handleRun();
        }
      });
    }

    if (!isFolder && (item.type === 'http-request' || item.type === 'graphql-request')) {
      items.push({
        id: 'generate-code',
        leftSection: IconCode,
        label: 'Generate Code',
        onClick: handleGenerateCode
      });
    }

    if (!isFolder && isItemARequest(item) && item.type === 'http-request') {
      items.push({
        id: 'create-example',
        leftSection: ExampleIcon,
        label: 'Create Example',
        onClick: () => setCreateExampleModalOpen(true)
      });
    }

    items.push(
      {
        id: 'show-in-folder',
        leftSection: IconFolder,
        label: getRevealInFolderLabel(),
        onClick: handleShowInFolder
      }
    );

    items.push({ id: 'separator-1', type: 'divider' });

    items.push({
      id: 'info',
      leftSection: IconInfoCircle,
      label: 'Info',
      onClick: () => setItemInfoModalOpen(true)
    });

    if (isFolder) {
      items.push(
        {
          id: 'settings',
          leftSection: IconSettings,
          label: 'Settings',
          onClick: viewFolderSettings
        },
        {
          id: 'open-terminal',
          leftSection: IconTerminal2,
          label: 'Open in Terminal',
          onClick: async () => {
            const folderCwd = item.pathname || collectionPathname;
            await openDevtoolsAndSwitchToTerminal(dispatch, folderCwd);
          }
        }
      );
    }

    items.push({
      id: 'delete',
      leftSection: IconTrash,
      label: 'Delete',
      className: 'delete-item',
      onClick: () => setDeleteItemModalOpen(true)
    });

    return items;
  };

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

  const handleCreateExample = async (name, description = '') => {
    // Create example with default values
    const exampleData = {
      name: name,
      description: description,
      status: '200',
      statusText: 'OK',
      headers: [],
      body: {
        type: 'text',
        content: ''
      }
    };

    // Calculate the index where the example will be saved
    const existingExamples = item.draft?.examples || item.examples || [];
    const exampleIndex = existingExamples.length;
    const exampleUid = uuid();

    dispatch(addResponseExample({
      itemUid: item.uid,
      collectionUid: collectionUid,
      example: {
        ...exampleData,
        uid: exampleUid
      }
    }));

    // Save the request
    await dispatch(saveRequest(item.uid, collectionUid, true));

    // Task middleware will track this and open the example in a new tab once the file is reloaded
    dispatch(insertTaskIntoQueue({
      uid: exampleUid,
      type: 'OPEN_EXAMPLE',
      collectionUid: collectionUid,
      itemUid: item.uid,
      exampleIndex: exampleIndex
    }));

    toast.success(`Example "${name}" created successfully`);
    setCreateExampleModalOpen(false);
  };

  const folderItems = sortByNameThenSequence(filter(item.items, (i) => isItemAFolder(i)));
  const requestItems = sortItemsBySequence(filter(item.items, (i) => isItemARequest(i)));

  const handleGenerateCode = () => {
    if (
      (item?.request?.url !== '')
      || (item?.draft?.request?.url !== undefined && item?.draft?.request?.url !== '')
    ) {
      setGenerateCodeItemModalOpen(true);
    } else {
      toast.error('URL is required');
    }
  };

  const viewFolderSettings = () => {
    if (isItemAFolder(item)) {
      if (isTabForItemPresent) {
        dispatch(focusTab({ uid: item.uid }));
        return;
      }
      dispatch(
        addTab({
          uid: item.uid,
          collectionUid,
          type: 'folder-settings'
        })
      );
    }
  };

  const handleCopyItem = () => {
    dispatch(copyRequest(item));
    const itemType = isFolder ? 'Folder' : 'Request';
    toast.success(`${itemType} copied to clipboard`);
  };

  const handlePasteItem = () => {
    // Determine target folder: if item is a folder, paste into it; otherwise paste into parent folder
    let targetFolderUid = item.uid;
    if (!isFolder) {
      const parentFolder = findParentItemInCollection(collection, item.uid);
      targetFolderUid = parentFolder ? parentFolder.uid : null;
    }

    dispatch(pasteItem(collectionUid, targetFolderUid))
      .then(() => {
        toast.success('Item pasted successfully');
      })
      .catch((err) => {
        toast.error(err ? err.message : 'An error occurred while pasting the item');
      });
  };

  // Keyboard shortcuts handler
  const handleKeyDown = (e) => {
    // Detect Mac by checking both metaKey and platform
    const isMac = navigator.userAgent?.includes('Mac') || navigator.platform?.startsWith('Mac');
    const isModifierPressed = isMac ? e.metaKey : e.ctrlKey;

    if (isModifierPressed && e.key.toLowerCase() === 'c') {
      e.preventDefault();
      e.stopPropagation();
      handleCopyItem();
    } else if (isModifierPressed && e.key.toLowerCase() === 'v') {
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

  return (
    <StyledWrapper className={className}>
      {renameItemModalOpen && (
        <RenameCollectionItem item={item} collectionUid={collectionUid} onClose={() => setRenameItemModalOpen(false)} />
      )}
      {cloneItemModalOpen && (
        <CloneCollectionItem item={item} collectionUid={collectionUid} onClose={() => setCloneItemModalOpen(false)} />
      )}
      {deleteItemModalOpen && (
        <DeleteCollectionItem item={item} collectionUid={collectionUid} onClose={() => setDeleteItemModalOpen(false)} />
      )}
      {newRequestModalOpen && (
        <NewRequest item={item} collectionUid={collectionUid} onClose={() => setNewRequestModalOpen(false)} />
      )}
      {newFolderModalOpen && (
        <NewFolder item={item} collectionUid={collectionUid} onClose={() => setNewFolderModalOpen(false)} />
      )}
      {runCollectionModalOpen && (
        <RunCollectionItem collectionUid={collectionUid} item={item} onClose={() => setRunCollectionModalOpen(false)} />
      )}
      {generateCodeItemModalOpen && (
        <GenerateCodeItem collectionUid={collectionUid} item={item} onClose={() => setGenerateCodeItemModalOpen(false)} />
      )}
      {itemInfoModalOpen && (
        <CollectionItemInfo item={item} onClose={() => setItemInfoModalOpen(false)} />
      )}
      <CreateExampleModal
        isOpen={createExampleModalOpen}
        onClose={() => setCreateExampleModalOpen(false)}
        onSave={handleCreateExample}
        title="Create Response Example"
        initialName={getInitialExampleName(item)}
      />
      <div
        className={itemRowClassName}
        ref={(node) => {
          ref.current = node;
          drag(drop(node));
        }}
        tabIndex={0}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onContextMenu={handleContextMenu}
        data-testid="sidebar-collection-item-row"
      >
        <div className="flex items-center h-full w-full">
          {indents && indents.length
            ? indents.map((i) => (
                <div
                  onClick={handleClick}
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
            onDoubleClick={handleDoubleClick}
          >

            {isFolder ? (
              <ActionIcon style={{ width: 16, minWidth: 16 }}>
                <IconChevronRight
                  size={16}
                  strokeWidth={2}
                  className={iconClassName}
                  style={{ color: 'rgb(160 160 160)' }}
                  onClick={handleFolderCollapse}
                  onDoubleClick={handleFolderDoubleClick}
                  data-testid="folder-chevron"
                />
              </ActionIcon>
            ) : hasExamples ? (
              <ActionIcon style={{ width: 16, minWidth: 16 }}>
                <IconChevronRight
                  size={16}
                  strokeWidth={2}
                  className={examplesIconClassName}
                  style={{ color: 'rgb(160 160 160)' }}
                  onClick={handleExamplesCollapse}
                  onDoubleClick={handleExamplesDoubleClick}
                  data-testid="request-item-chevron"
                />
              </ActionIcon>
            ) : null}

            <div className="ml-1 flex w-full h-full items-center overflow-hidden">
              <CollectionItemIcon item={item} />
              <span className="item-name" title={item.name}>
                {item.name}
              </span>
            </div>
          </div>
          <div className="pr-2">
            <MenuDropdown
              ref={menuDropdownRef}
              items={buildMenuItems()}
              placement="bottom-start"
              data-testid="collection-item-menu"
              popperOptions={{ strategy: 'fixed' }}
              appendTo={dropdownContainerRef?.current || document.body}
            >
              <ActionIcon className="menu-icon">
                <IconDots size={18} className="collection-item-menu-icon" />
              </ActionIcon>
            </MenuDropdown>
          </div>
        </div>
      </div>
      {!itemIsCollapsed ? (
        <div>
          {folderItems && folderItems.length
            ? folderItems.map((i) => {
                return <CollectionItem key={i.uid} item={i} collectionUid={collectionUid} collectionPathname={collectionPathname} searchText={searchText} />;
              })
            : null}
          {requestItems && requestItems.length
            ? requestItems.map((i) => {
                return <CollectionItem key={i.uid} item={i} collectionUid={collectionUid} collectionPathname={collectionPathname} searchText={searchText} />;
              })
            : null}
        </div>
      ) : null}

      {/* Show examples when expanded (only for HTTP requests) */}
      {isItemARequest(item) && item.type === 'http-request' && examplesExpanded && hasExamples && (
        <div>
          {(item.examples || []).map((example, index) => {
            return (
              <ExampleItem
                key={example.uid || index}
                example={example}
                item={item}
                index={index}
                collection={collection}
              />
            );
          })}
        </div>
      )}
    </StyledWrapper>
  );
};

export default React.memo(CollectionItem);
