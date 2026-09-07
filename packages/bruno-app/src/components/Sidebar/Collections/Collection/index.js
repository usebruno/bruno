import React, { useState, useEffect } from 'react';
import filter from 'lodash/filter';
import { useDispatch } from 'react-redux';
import { isItemAFolder, isItemARequest } from 'utils/collections';
import { sortByNameThenSequence } from 'utils/common/index';
import { createEmptyStateMenuItems } from 'utils/collections/emptyStateRequest';
import { useSidebarAccordion } from 'components/Sidebar/SidebarAccordionContext';
import MenuDropdown from 'ui/MenuDropdown';
import CollectionRow from './CollectionRow';
import CollectionItem from './CollectionItem';

// Delay before showing the empty-collection state (ms). Prevents flicker from the race between
// the collection's loading flag and the item batch arriving over IPC.
const EMPTY_STATE_DELAY_MS = 300;

/**
 * Thin recursive wrapper around CollectionRow. The row renders the collection header itself
 * (name, chevron, menu, drag/drop, multi-select); this wrapper computes the collection's grouped
 * children and, when expanded, renders them recursively as the row's `children`.
 */
const Collection = ({ collection, searchText, openBulkMenu }) => {
  const dispatch = useDispatch();
  const { dropdownContainerRef } = useSidebarAccordion();

  const hasSearchText = searchText && searchText?.trim()?.length;
  const collectionIsCollapsed = hasSearchText ? false : collection.collapsed;
  const isLoading = collection.isLoading;

  // Only count persisted requests/folders/apps; transients and file items don't affect empty state.
  const itemCount = collection.items?.filter((i) => !i.isTransient && (isItemARequest(i) || isItemAFolder(i) || i.type === 'app')).length || 0;

  const [showEmptyState, setShowEmptyState] = useState(false);
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

  const requestItems = [...filter(collection.items, (i) => isItemARequest(i) && !i.isTransient)].sort((a, b) => a.seq - b.seq);
  const appItems = [...filter(collection.items, (i) => i.type === 'app' && !i.isTransient)].sort((a, b) => a.seq - b.seq);
  const folderItems = sortByNameThenSequence(filter(collection.items, (i) => isItemAFolder(i) && !i.isTransient));
  const showEmptyCollectionMessage = showEmptyState && !hasSearchText;
  const emptyStateMenuItems = createEmptyStateMenuItems({ dispatch, collection, itemUid: null });

  return (
    <CollectionRow collection={collection} searchText={searchText} openBulkMenu={openBulkMenu}>
      <div>
        {!collectionIsCollapsed ? (
          <div>
            {folderItems?.map?.((i) => {
              return <CollectionItem key={i.uid} item={i} collectionUid={collection.uid} collectionPathname={collection.pathname} searchText={searchText} openBulkMenu={openBulkMenu} />;
            })}
            {appItems?.map?.((i) => {
              return <CollectionItem key={i.uid} item={i} collectionUid={collection.uid} collectionPathname={collection.pathname} searchText={searchText} openBulkMenu={openBulkMenu} />;
            })}
            {requestItems?.map?.((i) => {
              return <CollectionItem key={i.uid} item={i} collectionUid={collection.uid} collectionPathname={collection.pathname} searchText={searchText} openBulkMenu={openBulkMenu} />;
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

export default Collection;
