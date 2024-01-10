import React, { useState, useRef, forwardRef, useEffect } from 'react';
import range from 'lodash/range';
import filter from 'lodash/filter';
import classnames from 'classnames';
import { useDrag, useDrop } from 'react-dnd';
import { useSelector, useDispatch } from 'react-redux';
import { addTab, focusTab } from 'providers/ReduxStore/slices/tabs';
import { collectionFolderClicked } from 'providers/ReduxStore/slices/collections';
import { moveItem } from 'providers/ReduxStore/slices/collections/actions';
import { sendRequest } from 'providers/ReduxStore/slices/collections/actions';
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
import {
  BadgePlus,
  ChevronRight,
  CopyPlus,
  FileCode2,
  FilePenLine,
  FolderPlus,
  MoreHorizontal,
  Rocket,
  Trash2
} from 'lucide-react';
import { DropdownItem } from 'components/Dropdown/DropdownItem/dropdown_item';

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

  const [{ isDragging }, drag] = useDrag({
    type: `COLLECTION_ITEM_${collection.uid}`,
    item: item,
    collect: (monitor) => ({
      isDragging: monitor.isDragging()
    })
  });

  const [{ isOver }, drop] = useDrop({
    accept: `COLLECTION_ITEM_${collection.uid}`,
    drop: (draggedItem) => {
      if (draggedItem.uid !== item.uid) {
        dispatch(moveItem(collection.uid, draggedItem.uid, item.uid));
      }
    },
    canDrop: (draggedItem) => {
      return draggedItem.uid !== item.uid;
    },
    collect: (monitor) => ({
      isOver: monitor.isOver()
    })
  });

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
      <div ref={ref} className="group">
        <MoreHorizontal size={22} className="group-hover:text-slate-950 dark:group-hover:text-white" />
      </div>
    );
  });

  const iconClassName = classnames({
    'rotate-90': !itemIsCollapsed
  });

  const itemRowClassName = classnames('flex collection-item-name items-center', {
    'item-focused-in-tab': item.uid == activeTabUid,
    'item-hovered': isOver
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
    if (item.request.url !== '' || (item.draft?.request.url !== undefined && item.draft?.request.url !== '')) {
      setGenerateCodeItemModalOpen(true);
    } else {
      toast.error('URL is required');
    }
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
      <div className={itemRowClassName} ref={(node) => drag(drop(node))}>
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
                <ChevronRight
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
              <div className="flex flex-col px-1">
                {isFolder && (
                  <>
                    <DropdownItem
                      onClick={(e) => {
                        dropdownTippyRef.current.hide();
                        setNewRequestModalOpen(true);
                      }}
                    >
                      <BadgePlus size={16} className="mr-2" />
                      New Request
                    </DropdownItem>
                    <DropdownItem
                      onClick={(e) => {
                        dropdownTippyRef.current.hide();
                        setNewFolderModalOpen(true);
                      }}
                    >
                      <FolderPlus size={16} className="mr-2" />
                      New Folder
                    </DropdownItem>
                    <DropdownItem
                      onClick={(e) => {
                        dropdownTippyRef.current.hide();
                        setRunCollectionModalOpen(true);
                      }}
                    >
                      <Rocket size={16} className="mr-2" />
                      Run
                    </DropdownItem>
                  </>
                )}
                <DropdownItem
                  onClick={(e) => {
                    dropdownTippyRef.current.hide();
                    setRenameItemModalOpen(true);
                  }}
                >
                  <FilePenLine size={16} className="mr-2" />
                  Rename
                </DropdownItem>
                <DropdownItem
                  onClick={(e) => {
                    dropdownTippyRef.current.hide();
                    setCloneItemModalOpen(true);
                  }}
                >
                  <CopyPlus size={16} className="mr-2" />
                  Clone
                </DropdownItem>
                {!isFolder && (
                  <DropdownItem
                    onClick={(e) => {
                      dropdownTippyRef.current.hide();
                      handleClick(null);
                      handleRun();
                    }}
                  >
                    <Rocket size={16} className="mr-2" />
                    Run
                  </DropdownItem>
                )}
                {!isFolder && item.type === 'http-request' && (
                  <DropdownItem
                    onClick={(e) => {
                      handleGenerateCode(e);
                    }}
                  >
                    <FileCode2 size={16} className="mr-2" />
                    Generate Code
                  </DropdownItem>
                )}
                <DropdownItem
                  onClick={(e) => {
                    dropdownTippyRef.current.hide();
                    setDeleteItemModalOpen(true);
                  }}
                  className="text-red-500 hover:!bg-red-100 dark:hover:!bg-red-400/20"
                >
                  <Trash2 size={16} className="mr-2 text-red-500" />
                  Delete
                </DropdownItem>
              </div>
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
