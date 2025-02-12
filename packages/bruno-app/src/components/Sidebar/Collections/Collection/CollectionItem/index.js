import React, { useState, useRef, forwardRef, useEffect } from 'react';
import range from 'lodash/range';
import filter from 'lodash/filter';
import classnames from 'classnames';
import { useDrag, useDrop } from 'react-dnd';
import { IconChevronRight, IconDots } from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { addTab, focusTab } from 'providers/ReduxStore/slices/tabs';
import { moveItem, reorderAroundFolderItem, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { collectionFolderClicked } from 'providers/ReduxStore/slices/collections';
import Dropdown from 'components/Dropdown';
import NewRequest from 'components/Sidebar/NewRequest';
import NewFolder from 'components/Sidebar/NewFolder';
import RequestMethod from './RequestMethod';
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
import { uuid } from 'utils/common';

const CollectionItem = ({ item, collection, searchText }) => {
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isSidebarDragging = useSelector((state) => state.app.isDragging);
  const dispatch = useDispatch();

  const [renameItemModalOpen, setRenameItemModalOpen] = useState(false);
  const [cloneItemModalOpen, setCloneItemModalOpen] = useState(false);
  const [deleteItemModalOpen, setDeleteItemModalOpen] = useState(false);
  const [generateCodeItemModalOpen, setGenerateCodeItemModalOpen] = useState(false);
  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [runCollectionModalOpen, setRunCollectionModalOpen] = useState(false);
  const [itemIsCollapsed, setItemisCollapsed] = useState(item.collapsed);

  const isFolder = isItemAFolder(item);

  const [hoverTime, setHoverTime] = useState(0);
  const [action, setAction] = useState(null);
  const [dropPosition, setDropPosition] = useState(null); // 'above', 'below', or 'inside'

  const [{ isDragging }, drag] = useDrag({
    type: `COLLECTION_ITEM_${collection.uid}`,
    item: () => {
      return item;
    },
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [{ isOver, canDrop }, drop] = useDrop({
    accept: `COLLECTION_ITEM_${collection.uid}`,
    hover: (draggedItem, monitor) => {
      if (draggedItem.uid !== item.uid) {
        const hoverBoundingRect = ref.current?.getBoundingClientRect();
        const clientOffset = monitor.getClientOffset();

        if (hoverBoundingRect && clientOffset) {
          // Get vertical middle
          const hoverMiddleY = (hoverBoundingRect.bottom - hoverBoundingRect.top) / 2;
          // Get mouse position
          const clientY = clientOffset.y - hoverBoundingRect.top;

          // Define drop zones
          const upperQuarter = hoverBoundingRect.height * 0.25;
          const lowerQuarter = hoverBoundingRect.height * 0.75;

          // More precise position detection
          if (clientY < upperQuarter) {
            setDropPosition('above');
            setAction('SHORT_HOVER');
          } else if (clientY > lowerQuarter) {
            setDropPosition('below');
            setAction('SHORT_HOVER');
          } else {
            if (isFolder) {
              setDropPosition('inside');
              setAction('LONG_HOVER');
            } else {
              // If not a folder, default to above/below based on middle point
              setDropPosition(clientY < hoverMiddleY ? 'above' : 'below');
              setAction('SHORT_HOVER');
            }
          }
        }
      }
    },
    drop: (draggedItem) => {
      if (draggedItem.uid !== item.uid) {
        if (isFolder && dropPosition === 'inside') {
          // Move inside folder
          dispatch(moveItem(collection.uid, draggedItem.uid, item.uid));
        } else {
          // Move above or below
          dispatch(reorderAroundFolderItem(collection.uid, draggedItem.uid, item.uid));
        }
      }
      setDropPosition(null);
      setAction(null);
      hoverTime > 0 && setHoverTime(0);
    },
    canDrop: (draggedItem) => {
      return draggedItem.uid !== item.uid;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

  useEffect(() => {
    if (!isOver) {
      setDropPosition(null);
    }
  }, [isOver]);

  useEffect(() => {
    let timer;
    if (isOver && !canDrop) {
      timer = setInterval(() => {
        setHoverTime((prevTime) => prevTime + 100);
      }, 100);
    } else {
      setAction(null);
      setHoverTime(0);
      timer && clearInterval(timer);
    }
    return () => clearInterval(timer);
  }, [isOver, canDrop]);

  useEffect(() => {
    if (hoverTime >= 0 && hoverTime < 750) {
      setAction('SHORT_HOVER');
    } else if (hoverTime >= 750) {
      setAction('LONG_HOVER');
    } else {
      setAction(null);
    }
  }, [hoverTime]);

  useEffect(() => {
    if (searchText && searchText.length) {
      setItemisCollapsed(false);
    } else {
      setItemisCollapsed(item.collapsed);
    }
  }, [searchText, item]);

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

  const ref = useRef(null);

  const itemRowClassName = classnames('flex collection-item-name relative items-center', {
    'item-focused-in-tab': item.uid == activeTabUid,
    'item-hovered': isOver && canDrop,
    'drop-target': isOver && dropPosition === 'inside',
    'drop-target-above': isOver && dropPosition === 'above',
    'drop-target-below': isOver && dropPosition === 'below',
    'item-target': isOver && !canDrop && isFolder && action === 'LONG_HOVER',
    'item-seperator': isOver && !canDrop && (!isFolder || action === 'SHORT_HOVER')
  });

  const scrollToTheActiveTab = () => {
    const activeTab = document.querySelector('.request-tab.active');
    if (activeTab) {
      activeTab.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleRun = async () => {
    dispatch(sendRequest(item, collection.uid)).catch((err) =>
      toast.custom((t) => <NetworkError onClose={() => toast.dismiss(t.id)} />, {
        duration: 5000
      })
    );
  };

  const handleClick = (event) => {
    //scroll to the active tab
    setTimeout(scrollToTheActiveTab, 50);

    if (isItemARequest(item)) {
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
          requestPaneTab: getDefaultRequestPaneTab(item)
        })
      );
      return;
    }
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

  const handleDoubleClick = (event) => {
    setRenameItemModalOpen(true);
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

  // we need to sort request items by seq property
  const sortRequestItems = (items = []) => {
    return items.sort((a, b) => a.seq - b.seq);
  };

  const handleGenerateCode = (e) => {
    e.stopPropagation();
    dropdownTippyRef.current.hide();
    if (item.request.url !== '' || (item.draft?.request.url !== undefined && item.draft?.request.url !== '')) {
      setGenerateCodeItemModalOpen(true);
    } else {
      toast.error('URL is required');
    }
  };
  const viewFolderSettings = () => {
    dispatch(
      addTab({
        uid: uuid(),
        collectionUid: collection.uid,
        folderUid: item.uid,
        type: 'folder-settings'
      })
    );
  };
  const items = sortRequestItems(filter(item.items, (i) => isItemARequest(i) || isItemAFolder(i)));

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
      <div
        className={itemRowClassName}
        ref={(node) => {
          ref.current = node;
          drag(drop(node));
        }}
      >
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
            onClick={handleClick}
            onContextMenu={handleRightClick}
            onDoubleClick={handleDoubleClick}
            className="flex flex-grow items-center h-full overflow-hidden"
            style={{
              paddingLeft: 8
            }}
          >
            <div style={{ width: 16, minWidth: 16 }}>
              {isFolder ? (
                <IconChevronRight
                  size={16}
                  strokeWidth={2}
                  className={iconClassName}
                  style={{ color: 'rgb(160 160 160)' }}
                />
              ) : null}
            </div>

            <div className="ml-1 flex items-center overflow-hidden">
              <RequestMethod item={item} />
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
              {!isFolder && item.type === 'http-request' && (
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
          {items && items.length
            ? items.map((i) => {
                return <CollectionItem key={i.uid} item={i} collection={collection} searchText={searchText} />;
              })
            : null}
        </div>
      ) : null}
    </StyledWrapper>
  );
};

export default CollectionItem;
