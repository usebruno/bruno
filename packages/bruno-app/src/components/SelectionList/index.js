import React, { useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import StyledWrapper from './StyledWrapper';

const SelectionList = ({
  title,
  items,
  selectedItems,
  onSelectAll,
  onItemToggle,
  getItemId,
  renderItemLabel,
  visibleRows = 8,
  rowHeight = 30,
  rowGap = 2,
  listPadding = 8,
  emptyMessage
}) => {
  const { t } = useTranslation();
  const displayEmptyMessage = emptyMessage || t('SELECTION_LIST.NO_ITEMS');
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const someSelected = items.length > 0 && selectedItems.length > 0 && !allSelected;
  const selectAllRef = useRef(null);

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  return (
    <StyledWrapper
      $visibleRows={visibleRows}
      $rowHeight={rowHeight}
      $rowGap={rowGap}
      $listPadding={listPadding}
    >
      <div className="selection-toolbar">
        <span className="selection-title">{title}</span>
        <label className="selection-toggle">
          <input
            ref={selectAllRef}
            className="checkbox"
            type="checkbox"
            checked={allSelected}
            onChange={onSelectAll}
          />
          {t('SELECTION_LIST.SELECT_ALL')}
        </label>
      </div>
      <ul className="selection-list scrollbar-hover">
        {items.length === 0 && (
          <li className="selection-empty">{displayEmptyMessage}</li>
        )}
        {items.map((item) => {
          const itemId = getItemId(item);
          const isSelected = selectedItems.includes(itemId);

          return (
            <li key={itemId}>
              <label className="selection-item">
                <input
                  type="checkbox"
                  checked={isSelected}
                  onChange={() => onItemToggle(itemId)}
                />
                <span className="selection-path">{renderItemLabel(item)}</span>
              </label>
            </li>
          );
        })}
      </ul>
    </StyledWrapper>
  );
};

export default SelectionList;
