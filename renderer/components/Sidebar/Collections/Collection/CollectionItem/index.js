import React, { useState, useRef, forwardRef, useEffect } from 'react';
import range from 'lodash/range';
import classnames from 'classnames';
import { IconChevronRight, IconDots } from '@tabler/icons';
import { useSelector, useDispatch } from 'react-redux';
import { addTab, focusTab } from 'providers/ReduxStore/slices/tabs';
import { collectionFolderClicked } from 'providers/ReduxStore/slices/collections';
import Dropdown from 'components/Dropdown';
import NewRequest from 'components/Sidebar/NewRequest';
import NewFolder from 'components/Sidebar/NewFolder';
import RequestMethod from './RequestMethod';
import RenameCollectionItem from './RenameCollectionItem';
import CloneCollectionItem from './CloneCollectionItem';
import DeleteCollectionItem from './DeleteCollectionItem';
import { isItemARequest, isItemAFolder, itemIsOpenedInTabs } from 'utils/tabs';
import { doesRequestMatchSearchText, doesFolderHaveItemsMatchSearchText } from 'utils/collections/search';

import StyledWrapper from './StyledWrapper';

const CollectionItem = ({item, collection, searchText}) => {
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isDragging = useSelector((state) => state.app.isDragging);
  const dispatch = useDispatch();

  const [renameItemModalOpen, setRenameItemModalOpen] = useState(false);
  const [cloneItemModalOpen, setCloneItemModalOpen] = useState(false);
  const [deleteItemModalOpen, setDeleteItemModalOpen] = useState(false);
  const [newRequestModalOpen, setNewRequestModalOpen] = useState(false);
  const [newFolderModalOpen, setNewFolderModalOpen] = useState(false);
  const [itemIsCollapsed, setItemisCollapsed] = useState(item.collapsed);

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
        <IconDots size={22}/>
      </div>
    );
  });

  const iconClassName = classnames({
    'rotate-90': !itemIsCollapsed
  });

  const itemRowClassName = classnames('flex collection-item-name items-center', {
    'item-focused-in-tab': item.uid == activeTabUid
  });

  const handleClick = (event) => {
    if(isItemARequest(item)) {
      if(itemIsOpenedInTabs(item, tabs)) {
        dispatch(focusTab({
          uid: item.uid
        }));
      } else {
        dispatch(addTab({
          uid: item.uid,
          collectionUid: collection.uid
        }));
      }
    } else {
      dispatch(collectionFolderClicked({
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
    }
  };

  let indents = range(item.depth);
  const onDropdownCreate = (ref) => dropdownTippyRef.current = ref;
  const isFolder = isItemAFolder(item);

  const className = classnames('flex flex-col w-full', {
    'is-dragging': isDragging
  });

  if(searchText && searchText.length) {
    if(isItemARequest(item)) {
      if(!doesRequestMatchSearchText(item, searchText)) {
        return null;
      }
    } else {
      if (!doesFolderHaveItemsMatchSearchText(item, searchText)) {
        return null;
      };
    }
  }

  return (
    <StyledWrapper className={className}>
      {renameItemModalOpen && <RenameCollectionItem item={item} collection={collection} onClose={() => setRenameItemModalOpen(false)}/>}
      {cloneItemModalOpen && <CloneCollectionItem item={item} collection={collection} onClose={() => setCloneItemModalOpen(false)}/>}
      {deleteItemModalOpen && <DeleteCollectionItem item={item} collection={collection} onClose={() => setDeleteItemModalOpen(false)}/>}
      {newRequestModalOpen && <NewRequest item={item} collection={collection} onClose={() => setNewRequestModalOpen(false)}/>}
      {newFolderModalOpen && <NewFolder item={item} collection={collection} onClose={() => setNewFolderModalOpen(false)}/>}
      <div className={itemRowClassName}>
        <div className="flex items-center h-full w-full">
          {indents && indents.length ? indents.map((i) => {
            return (
              <div
                onClick={handleClick}
                className="indent-block"
                key={i}
                style = {{
                  width: 16,
                  minWidth: 16,
                  height: '100%'
                }}
              >
                &nbsp;{/* Indent */}
              </div>
            );
          }) : null}
          <div
            onClick={handleClick}
            className="flex flex-grow items-center h-full overflow-hidden"
            style = {{
              paddingLeft: 8
            }}
          >
            <div style={{width:16, minWidth: 16}}>
              {isFolder ? (
                <IconChevronRight size={16} strokeWidth={2} className={iconClassName} style={{color: 'rgb(160 160 160)'}}/>
              ) : null}
            </div>
            
            <div className="ml-1 flex items-center overflow-hidden">
              <RequestMethod item={item}/>
              <span className="item-name" title={item.name}>{item.name}</span>
            </div>
          </div>
          <div className="menu-icon pr-2">
            <Dropdown onCreate={onDropdownCreate} icon={<MenuIcon />} placement='bottom-start'>
              {isFolder && (
                <>
                  <div className="dropdown-item" onClick={(e) => {
                    dropdownTippyRef.current.hide();
                    setNewRequestModalOpen(true);
                  }}>
                    New Request
                  </div>
                  <div className="dropdown-item" onClick={(e) => {
                    dropdownTippyRef.current.hide();
                    setNewFolderModalOpen(true);
                  }}>
                    New Folder
                  </div>
                </>
              )}
              <div className="dropdown-item" onClick={(e) => {
                dropdownTippyRef.current.hide();
                setRenameItemModalOpen(true);
              }}>
                Rename
              </div>
              {!isFolder && (
                <div className="dropdown-item" onClick={(e) => {
                  dropdownTippyRef.current.hide();
                  setCloneItemModalOpen(true);
                }}>
                  Clone
                </div>
              )}
              <div className="dropdown-item delete-item" onClick={(e) => {
                dropdownTippyRef.current.hide();
                setDeleteItemModalOpen(true);
              }}>
                Delete
              </div>
            </Dropdown>
          </div>
        </div>
      </div>

      {!itemIsCollapsed ? (
        <div>
          {item.items && item.items.length ? item.items.map((i) => {
            return <CollectionItem
              key={i.uid}
              item={i}
              collection={collection}
              searchText={searchText}
            />
          }) : null}
        </div>
      ) : null}
    </StyledWrapper>
  );
};

export default CollectionItem;