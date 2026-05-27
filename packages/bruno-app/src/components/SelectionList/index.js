import React, { useRef, useEffect, useState } from 'react';
import { IconSearch } from '@tabler/icons';
import { search } from 'fast-fuzzy';
import StyledWrapper from './StyledWrapper';
import { SELECTION_LIST_MAX_WIDTH } from './constants';
import SelectionFooter from 'components/SelectionFooter';

export { IMPORT_COLLECTION_SELECTION_WIDTH } from './constants';

const normalizePath = (value) => value.replace(/\\/g, '/');

const SelectionList = ({
  title,
  items,
  selectedItems,
  onSelectAll,
  onItemToggle,
  getItemId,
  renderItemTitle,
  renderItemDescription,
  searchPlaceholder,
  visibleRows = 8,
  rowHeight = 40,
  rowGap = 4,
  emptyMessage = 'No items found',
  maxWidth = SELECTION_LIST_MAX_WIDTH,
  showSelectedCount = false
}) => {
  const [searchText, setSearchText] = useState('');
  const selectAllRef = useRef(null);
  const trimmedSearchText = searchText.trim();
  const matchedItems = trimmedSearchText ? search(trimmedSearchText, items, {
    keySelector: (item) => [
      renderItemTitle?.(item),
      renderItemDescription?.(item)
    ]
      .filter(Boolean)
      .join(' ')
  }) : items;
  const filteredEntries = matchedItems.map((item) => ({ item, itemId: getItemId(item) }));
  const filteredItemIds = filteredEntries.map(({ itemId }) => itemId);
  const selectedFilteredItemCount = filteredItemIds.filter((itemId) => selectedItems.includes(itemId)).length;
  const allSelected = filteredItemIds.length > 0 && selectedFilteredItemCount === filteredItemIds.length;
  const someSelected = selectedFilteredItemCount > 0 && !allSelected;
  const showFilteredEmptyState = items.length > 0 && filteredEntries.length === 0;
  const listRows = items.length > 0 ? Math.min(items.length, visibleRows) : 1;

  const handleSelectAll = (event) => {
    onSelectAll(event, filteredItemIds);
  };

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const renderItemContent = (item) => {
    const itemTitle = renderItemTitle(item);
    const description = renderItemDescription ? renderItemDescription(item) : null;

    return (
      <>
        <span className="selection-item-title">{itemTitle}</span>
        {description && (
          <span
            className="selection-item-description"
            title={typeof description === 'string' ? description : undefined}
          >
            {typeof description === 'string' ? normalizePath(description) : description}
          </span>
        )}
      </>
    );
  };

  return (
    <StyledWrapper
      $maxWidth={maxWidth}
      $visibleRows={listRows}
      $rowHeight={rowHeight}
      $rowGap={rowGap}
    >
      <div className="selection-heading">
        <span className="selection-title">{title}</span>
        <span className="selection-count">{items.length}</span>
      </div>
      <div className="selection-panel">
        <div className="selection-toolbar">
          <label className="selection-search">
            <IconSearch size={16} strokeWidth={1.5} />
            <input
              type="text"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={searchPlaceholder || `Search ${title}`}
            />
          </label>
          <label className="selection-toggle">
            <input
              ref={selectAllRef}
              className="checkbox"
              type="checkbox"
              checked={allSelected}
              onChange={handleSelectAll}
            />
            Select all
          </label>
        </div>
        <ul className="selection-list scrollbar-hover">
          {items.length === 0 && (
            <li className="selection-empty">
              <span className="selection-empty-message">{emptyMessage}</span>
            </li>
          )}
          {showFilteredEmptyState && (
            <li className="selection-empty">
              <span className="selection-empty-message">
                {`No matching ${typeof title === 'string' ? title.toLowerCase() : 'items'} found`}
              </span>
            </li>
          )}
          {filteredEntries.map(({ item, itemId }) => {
            const isSelected = selectedItems.includes(itemId);

            return (
              <li key={itemId}>
                <label className="selection-item">
                  <input
                    className="checkbox"
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onItemToggle(itemId)}
                  />
                  <span className="selection-content">
                    {renderItemContent(item)}
                  </span>
                </label>
              </li>
            );
          })}
        </ul>
      </div>
      {showSelectedCount && (
        <SelectionFooter className="selection-selected-count">
          <span>{selectedItems.length}</span> of {items.length} selected
        </SelectionFooter>
      )}
    </StyledWrapper>
  );
};

export default SelectionList;
