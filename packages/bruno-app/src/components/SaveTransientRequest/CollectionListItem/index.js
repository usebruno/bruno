import React, { useMemo, useCallback, memo } from 'react';
import { useSelector } from 'react-redux';
import { IconDatabase, IconCheck, IconLoader2 } from '@tabler/icons';
import { areItemsLoading } from 'utils/collections';

const CollectionListItem = memo(({ collectionUid, collectionPath, collectionName, isSelected, onSelect }) => {
  const collection = useSelector((state) =>
    state.collections.collections.find((c) => c.uid === collectionUid || c.pathname === collectionPath)
  );

  const { isFullyLoaded, isLoading } = useMemo(() => {
    const isMounted = collection?.mountStatus === 'mounted';
    const fullyLoaded = isMounted && !areItemsLoading(collection);
    const loading = isSelected && !fullyLoaded;
    return { isFullyLoaded: fullyLoaded, isLoading: loading };
  }, [collection, isSelected]);

  const handleClick = useCallback(() => {
    if (!isLoading) {
      onSelect();
    }
  }, [isLoading, onSelect]);

  return (
    <li
      className={`collection-item ${isLoading ? 'mounting' : ''} ${isSelected ? 'selected' : ''}`}
      onClick={handleClick}
    >
      <div className="collection-item-content">
        <IconDatabase size={16} strokeWidth={1.5} />
        <span className="collection-item-name">{collectionName}</span>
      </div>
      {isLoading && (
        <IconLoader2 size={16} strokeWidth={1.5} className="animate-spin" />
      )}
      {isFullyLoaded && (
        <IconCheck size={16} strokeWidth={1.5} className="text-green-600" />
      )}
    </li>
  );
});

export default CollectionListItem;
