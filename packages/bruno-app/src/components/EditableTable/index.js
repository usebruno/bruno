import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { IconTrash, IconAlertCircle, IconGripVertical, IconMinusVertical } from '@tabler/icons';
import { Tooltip } from 'react-tooltip';
import { uuid } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const MIN_COLUMN_WIDTH = 80;
const ROW_HEIGHT = 35;

const findScrollParent = (element) => {
  let parent = element?.parentElement;
  while (parent) {
    const { overflowY } = getComputedStyle(parent);
    if (overflowY === 'auto' || overflowY === 'scroll') return parent;
    parent = parent.parentElement;
  }
  return null;
};

const TableRow = React.memo(
  ({ children, item, context, ...rest }) => {
    const rowIndex = Number(rest['data-item-index']);
    const { reorderable, reorderableRowCount, isLastEmptyRow, onDragStart, onDragOver, onDrop, onDragEnd } = context;
    const isEmpty = isLastEmptyRow(item, rowIndex);
    const canDrag = reorderable && !isEmpty && rowIndex < reorderableRowCount;

    return (
      <tr
        {...rest}
        draggable={canDrag}
        onDragStart={canDrag ? (e) => onDragStart(e, rowIndex) : undefined}
        onDragOver={canDrag ? (e) => onDragOver(e, rowIndex) : undefined}
        onDrop={canDrag ? (e) => onDrop(e, rowIndex) : undefined}
        onDragEnd={canDrag ? onDragEnd : undefined}
      >
        {children}
      </tr>
    );
  }
);

const EditableTable = ({
  tableId, // Not being used kept to maintain uniqueness & pass similar in onColumnWidthsChange
  columns,
  rows,
  onChange,
  defaultRow,
  getRowError,
  showCheckbox = true,
  showDelete = true,
  disableCheckbox = false,
  checkboxLabel = '',
  checkboxKey = 'enabled',
  reorderable = false,
  onReorder,
  showAddRow = true,
  testId = 'editable-table',
  columnWidths,
  onColumnWidthsChange
}) => {
  const wrapperRef = useRef(null);
  const virtuosoRef = useRef(null);
  const emptyRowUidRef = useRef(null);
  const prevRowCountRef = useRef(0);
  const [resizing, setResizing] = useState(null);
  const [tableHeight, setTableHeight] = useState(0);
  const [scrollParent, setScrollParent] = useState(null);
  const widths = columnWidths || {};

  useLayoutEffect(() => {
    setScrollParent(findScrollParent(wrapperRef.current));
  }, []);

  const handleTotalHeightChanged = useCallback((h) => {
    setTableHeight(h);
  }, []);

  const handleColumnWidthsChange = useCallback((newWidths) => {
    onColumnWidthsChange?.(newWidths);
  }, [onColumnWidthsChange]);

  const handleResizeStart = useCallback((e, columnKey) => {
    e.preventDefault();
    e.stopPropagation();

    const currentCell = e.target.closest('td');
    const nextCell = currentCell?.nextElementSibling;
    if (!currentCell || !nextCell) return;

    const columnIndex = columns.findIndex((col) => col.key === columnKey);
    if (columnIndex >= columns.length - 1) return;

    const startX = e.clientX;
    const startWidth = currentCell.offsetWidth;
    const nextColumnKey = columns[columnIndex + 1].key;
    const nextColumnStartWidth = nextCell.offsetWidth;

    setResizing(columnKey);

    const handleMouseMove = (moveEvent) => {
      const diff = moveEvent.clientX - startX;
      const maxGrow = nextColumnStartWidth - MIN_COLUMN_WIDTH;
      const maxShrink = startWidth - MIN_COLUMN_WIDTH;
      const clampedDiff = Math.max(-maxShrink, Math.min(maxGrow, diff));

      const newWidths = {
        ...widths,
        [columnKey]: `${startWidth + clampedDiff}px`,
        [nextColumnKey]: `${nextColumnStartWidth - clampedDiff}px`
      };

      handleColumnWidthsChange(newWidths);
    };

    const handleMouseUp = () => {
      // Convert pixel widths to percentages for responsive scaling
      const table = wrapperRef.current?.querySelector('table');
      if (table) {
        const tableWidth = table.offsetWidth;
        const headerCells = table.querySelectorAll('thead td');
        const newWidths = {};

        headerCells.forEach((cell, cellIndex) => {
          const checkboxOffset = showCheckbox ? 1 : 0;
          const colIndex = cellIndex - checkboxOffset;

          if (colIndex >= 0 && colIndex < columns.length) {
            const colKey = columns[colIndex]?.key;
            if (colKey) {
              const percentage = (cell.offsetWidth / tableWidth) * 100;
              newWidths[colKey] = `${percentage}%`;
            }
          }
        });

        if (Object.keys(newWidths).length > 0) {
          handleColumnWidthsChange({ ...widths, ...newWidths });
        }
      }
      setResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columns, showCheckbox, widths, handleColumnWidthsChange]);

  const getColumnWidth = useCallback((column) => {
    return widths[column.key] || column.width || 'auto';
  }, [widths]);

  const createEmptyRow = useCallback(() => {
    const newUid = uuid();
    emptyRowUidRef.current = newUid;
    return {
      uid: newUid,
      [checkboxKey]: true,
      ...defaultRow
    };
  }, [defaultRow, checkboxKey]);

  const rowsWithEmpty = useMemo(() => {
    if (!showAddRow) {
      return rows;
    }

    if (rows.length === 0) {
      return [createEmptyRow()];
    }

    const lastRow = rows[rows.length - 1];
    const keyColumn = columns.find((col) => col.isKeyField);

    if (keyColumn) {
      const lastRowKeyValue = keyColumn.getValue ? keyColumn.getValue(lastRow) : lastRow[keyColumn.key];
      const isLastRowEmpty = !lastRowKeyValue || (typeof lastRowKeyValue === 'string' && lastRowKeyValue.trim() === '');

      if (isLastRowEmpty) {
        return rows;
      }
    }

    if (!emptyRowUidRef.current || rows.some((r) => r.uid === emptyRowUidRef.current)) {
      emptyRowUidRef.current = uuid();
    }

    return [...rows, {
      uid: emptyRowUidRef.current,
      [checkboxKey]: true,
      ...defaultRow
    }];
  }, [rows, columns, defaultRow, checkboxKey, createEmptyRow, showAddRow]);

  const isEmptyRow = useCallback((row) => {
    const keyColumn = columns.find((col) => col.isKeyField);
    if (!keyColumn) return false;

    const value = keyColumn.getValue ? keyColumn.getValue(row) : row[keyColumn.key];
    return !value || (typeof value === 'string' && value.trim() === '');
  }, [columns]);

  const isLastEmptyRow = useCallback((row, index) => {
    if (!showAddRow) return false;
    return index === rowsWithEmpty.length - 1 && isEmptyRow(row);
  }, [rowsWithEmpty.length, isEmptyRow, showAddRow]);

  useEffect(() => {
    if (rowsWithEmpty.length > prevRowCountRef.current && prevRowCountRef.current > 0) {
      virtuosoRef.current?.scrollToIndex({
        index: rowsWithEmpty.length - 1,
        behavior: 'smooth'
      });
    }
    prevRowCountRef.current = rowsWithEmpty.length;
  }, [rowsWithEmpty.length]);

  const handleValueChange = useCallback((rowUid, key, value) => {
    const rowIndex = rowsWithEmpty.findIndex((r) => r.uid === rowUid);
    if (rowIndex === -1) return;

    const currentRow = rowsWithEmpty[rowIndex];
    const isLast = rowIndex === rowsWithEmpty.length - 1;
    const wasEmpty = isEmptyRow(currentRow);

    const keyColumn = columns.find((col) => col.isKeyField);
    const isKeyFieldChange = keyColumn && keyColumn.key === key;

    let updatedRows = rowsWithEmpty.map((row) => {
      if (row.uid === rowUid) {
        return { ...row, [key]: value };
      }
      return row;
    });

    // Only add a new empty row when the key field is filled
    if (showAddRow && isLast && wasEmpty && isKeyFieldChange && value && value.trim() !== '') {
      emptyRowUidRef.current = uuid();
      updatedRows.push({
        uid: emptyRowUidRef.current,
        [checkboxKey]: true,
        ...defaultRow
      });
    }

    const hasAnyValue = (row) => {
      for (const col of columns) {
        const val = col.getValue ? col.getValue(row) : row[col.key];
        const defaultVal = defaultRow[col.key];
        if (val && val !== defaultVal && (typeof val !== 'string' || val.trim() !== '')) {
          return true;
        }
      }
      return false;
    };

    const result = updatedRows.filter((row, i) => {
      if (showAddRow && i === updatedRows.length - 1) {
        return hasAnyValue(row);
      }
      return true;
    });

    onChange(result);
  }, [rowsWithEmpty, columns, onChange, checkboxKey, defaultRow, isEmptyRow, showAddRow]);

  const handleCheckboxChange = useCallback((rowUid, checked) => {
    handleValueChange(rowUid, checkboxKey, checked);
  }, [handleValueChange, checkboxKey]);

  const handleRemoveRow = useCallback((rowUid) => {
    const filteredRows = rows.filter((row) => row.uid !== rowUid);
    onChange(filteredRows);
  }, [rows, onChange]);

  const handleDragStart = useCallback((e, index) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', index);
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const reorderableRowCount = showAddRow ? rowsWithEmpty.length - 1 : rowsWithEmpty.length;

  const handleDrop = useCallback((e, toIndex) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (fromIndex === toIndex || !onReorder) return;
    const reorderableRows = showAddRow ? rowsWithEmpty.slice(0, -1) : rowsWithEmpty;
    const updatedOrder = [...reorderableRows];
    const [movedRow] = updatedOrder.splice(fromIndex, 1);
    if (!movedRow) return;
    updatedOrder.splice(toIndex, 0, movedRow);
    onReorder({ updateReorderedItem: updatedOrder.map((row) => row.uid) });
  }, [onReorder, rowsWithEmpty, showAddRow]);

  const handleDragEnd = useCallback(() => {}, []);

  const renderCell = useCallback((column, row, rowIndex) => {
    const isEmpty = isLastEmptyRow(row, rowIndex);
    const value = column.getValue ? column.getValue(row) : row[column.key];
    const error = getRowError?.(row, rowIndex, column.key);

    const errorIcon = error && !isEmpty ? (
      <span>
        <IconAlertCircle
          data-tooltip-id={`error-${row.uid}-${column.key}`}
          className="text-red-600 cursor-pointer ml-1"
          size={20}
        />
        <Tooltip
          className="tooltip-mod"
          id={`error-${row.uid}-${column.key}`}
          html={error}
        />
      </span>
    ) : null;

    if (column.render) {
      return (
        <div className="flex items-center">
          {column.render({
            row,
            value,
            rowIndex,
            isLastEmptyRow: isEmpty,
            onChange: (newValue) => handleValueChange(row.uid, column.key, newValue)
          })}
          {errorIcon}
        </div>
      );
    }

    return (
      <div className="flex items-center">
        <input
          type="text"
          autoComplete="off"
          autoCorrect="off"
          autoCapitalize="off"
          spellCheck="false"
          className="mousetrap"
          value={value || ''}
          readOnly={column.readOnly}
          placeholder={!value ? column.placeholder || column.name : ''}
          onChange={(e) => handleValueChange(row.uid, column.key, e.target.value)}
        />
        {errorIcon}
      </div>
    );
  }, [isLastEmptyRow, getRowError, handleValueChange]);

  const virtuosoContext = useMemo(() => ({
    reorderable,
    reorderableRowCount,
    isLastEmptyRow,
    onDragStart: handleDragStart,
    onDragOver: handleDragOver,
    onDrop: handleDrop,
    onDragEnd: handleDragEnd
  }), [reorderable, reorderableRowCount, isLastEmptyRow, handleDragStart, handleDragOver, handleDrop, handleDragEnd]);

  const fixedHeaderContent = useCallback(() => (
    <tr>
      {showCheckbox && (
        <td className="text-center">{checkboxLabel}</td>
      )}
      {columns.map((column, colIndex) => (
        <td
          key={column.key}
          style={{ width: getColumnWidth(column) }}
        >
          <span className="column-name">{column.name}</span>
          {colIndex < columns.length - 1 && (
            <div
              className={`resize-handle ${resizing === column.key ? 'resizing' : ''}`}
              style={{ height: tableHeight > 0 ? `${tableHeight}px` : undefined }}
              onMouseDown={(e) => handleResizeStart(e, column.key)}
            />
          )}
        </td>
      ))}
      {showDelete && (
        <td style={{ width: '60px' }}></td>
      )}
    </tr>
  ), [showCheckbox, checkboxLabel, columns, getColumnWidth, resizing, tableHeight, handleResizeStart, showDelete]);

  const itemContent = useCallback((rowIndex, row) => {
    const isEmpty = isLastEmptyRow(row, rowIndex);
    const canDrag = reorderable && !isEmpty && rowIndex < reorderableRowCount;

    return (
      <>
        {showCheckbox && (
          <td className="text-center relative">
            {reorderable && canDrag && (
              <div
                draggable
                className="drag-handle group absolute z-10 left-[-8px] top-1/2 -translate-y-1/2 p-1 cursor-grab"
              >
                <IconGripVertical
                  size={14}
                  className="icon-grip hidden group-hover:block"
                />
                <IconMinusVertical
                  size={14}
                  className="icon-minus block group-hover:hidden"
                />
              </div>
            )}
            {!isEmpty && (
              <input
                type="checkbox"
                className="mousetrap"
                data-testid="column-checkbox"
                checked={row[checkboxKey] ?? true}
                disabled={disableCheckbox}
                onChange={(e) => handleCheckboxChange(row.uid, e.target.checked)}
              />
            )}
          </td>
        )}
        {columns.map((column) => (
          <td key={column.key} data-testid={`column-${column.key}`}>
            {renderCell(column, row, rowIndex)}
          </td>
        ))}
        {showDelete && (
          <td>
            {!isEmpty && (
              <button
                data-testid="column-delete"
                onClick={() => handleRemoveRow(row.uid)}
              >
                <IconTrash strokeWidth={1.5} size={18} />
              </button>
            )}
          </td>
        )}
      </>
    );
  }, [showCheckbox, reorderable, reorderableRowCount, isLastEmptyRow, checkboxKey, disableCheckbox, handleCheckboxChange, columns, renderCell, showDelete, handleRemoveRow]);

  return (
    <StyledWrapper
      ref={wrapperRef}
      data-testid={testId}
      className={`${showCheckbox ? 'has-checkbox' : 'no-checkbox'} ${resizing ? 'is-resizing' : ''}`}
    >
      <TableVirtuoso
        ref={virtuosoRef}
        className="table-container"
        customScrollParent={scrollParent || undefined}
        data={rowsWithEmpty}
        components={{ TableRow }}
        context={virtuosoContext}
        defaultItemHeight={ROW_HEIGHT}
        totalListHeightChanged={handleTotalHeightChanged}
        computeItemKey={(_, item) => item.uid}
        fixedHeaderContent={fixedHeaderContent}
        itemContent={itemContent}
      />
    </StyledWrapper>
  );
};

export default EditableTable;
