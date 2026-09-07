import React from 'react';
import range from 'lodash/range';
import filter from 'lodash/filter';
import { useSelector, useDispatch } from 'react-redux';
import { isItemAFolder, isItemARequest } from 'utils/tabs';
import { sortByNameThenSequence } from 'utils/common/index';
import { createEmptyStateMenuItems } from 'utils/collections/emptyStateRequest';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';
import MenuDropdown from 'ui/MenuDropdown';
import CollectionItemRow from './CollectionItemRow';

/**
 * Thin recursive wrapper around CollectionItemRow. The row renders the item itself (name,
 * chevron, menu, drag/drop, multi-select, examples); this wrapper computes the item's grouped
 * children and, when the folder is expanded, renders them recursively as the row's `children`.
 */
const CollectionItem = ({ item, collectionUid, collectionPathname, searchText, openBulkMenu }) => {
  const dispatch = useDispatch();
  const allCollections = useSelector((state) => state.collections.collections);
  const collection = allCollections?.find((c) => c.uid === collectionUid);
  const { dropdownContainerRef } = useSidebarAccordion();

  const hasSearchText = searchText && searchText?.trim()?.length;
  const itemIsCollapsed = hasSearchText ? false : item.collapsed;
  const isFolder = isItemAFolder(item);

  const folderItems = sortByNameThenSequence(filter(item.items, (i) => isItemAFolder(i) && !i.isTransient));
  const appItems = [...filter(item.items, (i) => i.type === 'app' && !i.isTransient)].sort((a, b) => a.seq - b.seq);
  const requestItems = [...filter(item.items, (i) => isItemARequest(i) && !i.isTransient)].sort((a, b) => a.seq - b.seq);
  const showEmptyFolderMessage = isFolder && !hasSearchText && !folderItems?.length && !appItems?.length && !requestItems?.length;
  const emptyFolderMenuItems = createEmptyStateMenuItems({ dispatch, collection, itemUid: item.uid });

  return (
    <CollectionItemRow
      item={item}
      collectionUid={collectionUid}
      collectionPathname={collectionPathname}
      searchText={searchText}
      openBulkMenu={openBulkMenu}
    >
      {!itemIsCollapsed ? (
        <div>
          {folderItems.map((i) => (
            <CollectionItem key={i.uid} item={i} collectionUid={collectionUid} collectionPathname={collectionPathname} searchText={searchText} openBulkMenu={openBulkMenu} />
          ))}
          {appItems.map((i) => (
            <CollectionItem key={i.uid} item={i} collectionUid={collectionUid} collectionPathname={collectionPathname} searchText={searchText} openBulkMenu={openBulkMenu} />
          ))}
          {requestItems.map((i) => (
            <CollectionItem key={i.uid} item={i} collectionUid={collectionUid} collectionPathname={collectionPathname} searchText={searchText} openBulkMenu={openBulkMenu} />
          ))}
          {showEmptyFolderMessage ? (
            <div className="empty-folder-message">
              {range(item.depth + 1).map((i) => (
                <div className="indent-block" key={i} style={{ width: 16, minWidth: 16, height: '100%' }}>
                  &nbsp;
                </div>
              ))}
              <div style={{ paddingLeft: 8 }}>
                <MenuDropdown
                  data-testid="add-request-cta-folder"
                  items={emptyFolderMenuItems}
                  placement="bottom-start"
                  appendTo={dropdownContainerRef?.current || document.body}
                  popperOptions={{ strategy: 'fixed' }}
                >
                  <button className="ml-1 add-request-link">+ Add request</button>
                </MenuDropdown>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </CollectionItemRow>
  );
};

export default React.memo(CollectionItem);
