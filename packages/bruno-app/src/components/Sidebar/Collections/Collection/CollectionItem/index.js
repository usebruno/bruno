import React from 'react';
import range from 'lodash/range';
import filter from 'lodash/filter';
import { useSelector, useDispatch } from 'react-redux';
import { isItemARequest, isItemAFolder } from 'utils/tabs';
import { doesRequestMatchSearchText, doesFolderHaveItemsMatchSearchText } from 'utils/collections/search';
import { sortByNameThenSequence } from 'utils/common/index';
import { createEmptyStateMenuItems } from 'utils/collections/emptyStateRequest';
import MenuDropdown from 'ui/MenuDropdown';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';
import CollectionItemRow from './CollectionItemRow';

const CollectionItem = ({ item, collectionUid, collectionPathname, searchText }) => {
  const { dropdownContainerRef } = useSidebarAccordion();
  const dispatch = useDispatch();
  const collection = useSelector((state) => state.collections.collections?.find((c) => c.uid === collectionUid));

  const isFolder = isItemAFolder(item);
  const hasSearchText = searchText && searchText?.trim()?.length;
  const itemIsCollapsed = hasSearchText ? false : item.collapsed;

  // Search gating: hide an item whose subtree has no match (identical to prior behavior).
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

  // Sort items by their "seq" property.
  const sortItemsBySequence = (items = []) => {
    return items.sort((a, b) => a.seq - b.seq);
  };

  const folderItems = sortByNameThenSequence(filter(item.items, (i) => isItemAFolder(i) && !i.isTransient));
  const appItems = sortItemsBySequence(filter(item.items, (i) => i.type === 'app' && !i.isTransient));
  const requestItems = sortItemsBySequence(filter(item.items, (i) => isItemARequest(i) && !i.isTransient));
  const showEmptyFolderMessage
    = isFolder && !hasSearchText && !folderItems?.length && !appItems?.length && !requestItems?.length;

  const emptyFolderMenuItems = createEmptyStateMenuItems({ dispatch, collection, itemUid: item.uid });

  return (
    <CollectionItemRow
      item={item}
      collectionUid={collectionUid}
      collectionPathname={collectionPathname}
      searchText={searchText}
      depth={item.depth}
    >
      {!itemIsCollapsed ? (
        <div>
          {folderItems && folderItems.length
            ? folderItems.map((i) => (
                <CollectionItem key={i.uid} item={i} collectionUid={collectionUid} collectionPathname={collectionPathname} searchText={searchText} />
              ))
            : null}
          {appItems && appItems.length
            ? appItems.map((i) => (
                <CollectionItem key={i.uid} item={i} collectionUid={collectionUid} collectionPathname={collectionPathname} searchText={searchText} />
              ))
            : null}
          {requestItems && requestItems.length
            ? requestItems.map((i) => (
                <CollectionItem key={i.uid} item={i} collectionUid={collectionUid} collectionPathname={collectionPathname} searchText={searchText} />
              ))
            : null}
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
