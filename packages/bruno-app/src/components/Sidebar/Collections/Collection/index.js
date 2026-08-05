import React, { useState, useEffect } from 'react';
import filter from 'lodash/filter';
import { useDispatch } from 'react-redux';
import CollectionItem from './CollectionItem';
import { doesCollectionHaveItemsMatchingSearchText } from 'utils/collections/search';
import { isItemAFolder, isItemARequest } from 'utils/collections';
import { sortByNameThenSequence } from 'utils/common/index';
import MenuDropdown from 'ui/MenuDropdown';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';
import { createEmptyStateMenuItems } from 'utils/collections/emptyStateRequest';
import CollectionRow from './CollectionRow';

// Delay before showing empty collection state (ms)
// This prevents flicker from race condition between loading state and item batch updates
const EMPTY_STATE_DELAY_MS = 300;

const Collection = ({ collection, searchText }) => {
  const { dropdownContainerRef } = useSidebarAccordion();
  const dispatch = useDispatch();
  const isLoading = collection.isLoading;
  const [showEmptyState, setShowEmptyState] = useState(false);

  // Only count persisted requests and folders; transients and file items
  // (bruno.json, .js scripts) don't affect empty state
  const itemCount = collection.items?.filter((i) => !i.isTransient && (isItemARequest(i) || isItemAFolder(i) || i.type === 'app')).length || 0;

  const hasSearchText = searchText && searchText?.trim()?.length;
  const collectionIsCollapsed = hasSearchText ? false : collection.collapsed;

  // Debounce showing empty state to prevent flicker
  // Race condition: isLoading can become false before items batch arrives from IPC
  useEffect(() => {
    const isMounted = collection.mountStatus === 'mounted';
    const hasItems = itemCount > 0;

    if (hasItems || isLoading || !isMounted) {
      setShowEmptyState(false);
      return;
    }

    const timer = setTimeout(() => setShowEmptyState(true), EMPTY_STATE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [itemCount, isLoading, collection.mountStatus]);

  if (searchText && searchText.length) {
    if (!doesCollectionHaveItemsMatchingSearchText(collection, searchText)) {
      return null;
    }
  }

  // we need to sort request items by seq property
  const sortItemsBySequence = (items = []) => {
    return items.sort((a, b) => a.seq - b.seq);
  };

  const requestItems = sortItemsBySequence(filter(collection.items, (i) => isItemARequest(i) && !i.isTransient));
  const appItems = sortItemsBySequence(filter(collection.items, (i) => i.type === 'app' && !i.isTransient));
  const folderItems = sortByNameThenSequence(filter(collection.items, (i) => isItemAFolder(i) && !i.isTransient));
  const showEmptyCollectionMessage = showEmptyState && !hasSearchText;

  const emptyStateMenuItems = createEmptyStateMenuItems({ dispatch, collection, itemUid: null });

  return (
    <CollectionRow collection={collection} searchText={searchText}>
      <div>
        {!collectionIsCollapsed ? (
          <div>
            {folderItems?.map?.((i) => {
              return <CollectionItem key={i.uid} item={i} collectionUid={collection.uid} collectionPathname={collection.pathname} searchText={searchText} />;
            })}
            {appItems?.map?.((i) => {
              return <CollectionItem key={i.uid} item={i} collectionUid={collection.uid} collectionPathname={collection.pathname} searchText={searchText} />;
            })}
            {requestItems?.map?.((i) => {
              return <CollectionItem key={i.uid} item={i} collectionUid={collection.uid} collectionPathname={collection.pathname} searchText={searchText} />;
            })}
            {showEmptyCollectionMessage ? (
              <div className="empty-collection-message">
                <div className="indent-block" style={{ width: 16, minWidth: 16, height: '100%' }}>
                  &nbsp;
                </div>
                <div style={{ paddingLeft: 8 }}>
                  <MenuDropdown
                    data-testid="add-request-cta"
                    items={emptyStateMenuItems}
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
      </div>
    </CollectionRow>
  );
};

export default React.memo(Collection);
