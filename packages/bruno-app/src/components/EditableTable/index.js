import React, { useCallback, useMemo, useRef, useState, useEffect } from 'react';
import { IconTrash, IconAlertCircle, IconGripVertical, IconMinusVertical } from '@tabler/icons';
import { Tooltip } from 'react-tooltip';
import { uuid } from 'utils/common';
import StyledWrapper from './StyledWrapper';

const MIN_COLUMN_WIDTH = 80;

const EditableTable = ({
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
  testId = 'editable-table'
}) => {
  const tableRef = useRef(null);
  const emptyRowUidRef = useRef(null);
  const [hoveredRow, setHoveredRow] = useState(null);
  const [resizing, setResizing] = useState(null);
  const [tableHeight, setTableHeight] = useState(0);
  const [columnWidths, setColumnWidths] = useState(() => {
    const initialWidths = {};
    columns.forEach((col) => {
      initialWidths[col.key] = col.width || 'auto';
    });
    return initialWidths;
  });

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

      setColumnWidths((prev) => ({
        ...prev,
        [columnKey]: `${startWidth + clampedDiff}px`,
        [nextColumnKey]: `${nextColumnStartWidth - clampedDiff}px`
      }));
    };

    const handleMouseUp = () => {
      // Convert pixel widths to percentages for responsive scaling
      const table = tableRef.current?.querySelector('table');
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
          setColumnWidths((prev) => ({ ...prev, ...newWidths }));
        }
      }
      setResizing(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [columns, showCheckbox]);

  // Track table height for resize handles
  useEffect(() => {
    const table = tableRef.current?.querySelector('table');
    if (!table) return;

    const updateHeight = () => {
      setTableHeight(table.offsetHeight);
    };

    updateHeight();

    const resizeObserver = new ResizeObserver(updateHeight);
    resizeObserver.observe(table);

    return () => resizeObserver.disconnect();
  }, [rows.length]);

  const getColumnWidth = useCallback((column) => {
    return columnWidths[column.key] || column.width || 'auto';
  }, [columnWidths]);

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

  const handleDragOver = useCallback((e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setHoveredRow(index);
  }, []);

  const handleDrop = useCallback((e, toIndex) => {
    e.preventDefault();
    const fromIndex = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (fromIndex !== toIndex && onReorder) {
      const reorderableRows = showAddRow ? rowsWithEmpty.slice(0, -1) : rowsWithEmpty;
      const updatedOrder = [...reorderableRows];
      const [movedRow] = updatedOrder.splice(fromIndex, 1);
      if (!movedRow) {
        setHoveredRow(null);
        return;
      }
      updatedOrder.splice(toIndex, 0, movedRow);
      onReorder({ updateReorderedItem: updatedOrder.map((row) => row.uid) });
    }
    setHoveredRow(null);
  }, [onReorder, rowsWithEmpty, showAddRow]);

  const handleDragEnd = useCallback(() => {
    setHoveredRow(null);
  }, []);

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

  const reorderableRowCount = showAddRow ? rowsWithEmpty.length - 1 : rowsWithEmpty.length;

  return (
    <StyledWrapper className={`${showCheckbox ? 'has-checkbox' : 'no-checkbox'} ${resizing ? 'is-resizing' : ''}`}>
      <div className="table-container" ref={tableRef} data-testid={testId}>
        <table>
          <thead>
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
          </thead>
          <tbody>
            {rowsWithEmpty.map((row, rowIndex) => {
              const isEmpty = isLastEmptyRow(row, rowIndex);
              const canDrag = reorderable && !isEmpty && rowIndex < reorderableRowCount;

              return (
                <tr
                  key={row.uid}
                  draggable={canDrag}
                  onDragStart={canDrag ? (e) => handleDragStart(e, rowIndex) : undefined}
                  onDragOver={canDrag ? (e) => handleDragOver(e, rowIndex) : undefined}
                  onDrop={canDrag ? (e) => handleDrop(e, rowIndex) : undefined}
                  onDragEnd={canDrag ? handleDragEnd : undefined}
                  onMouseEnter={() => setHoveredRow(rowIndex)}
                  onMouseLeave={() => setHoveredRow(null)}
                >
                  {showCheckbox && (
                    <td className="text-center relative">
                      {reorderable && canDrag && (
                        <div
                          draggable
                          className="drag-handle group absolute z-10 left-[-8px] top-1/2 -translate-y-1/2 p-1 cursor-grab"
                        >
                          {hoveredRow === rowIndex && (
                            <>
                              <IconGripVertical
                                size={14}
                                className="icon-grip hidden group-hover:block"
                              />
                              <IconMinusVertical
                                size={14}
                                className="icon-minus block group-hover:hidden"
                              />
                            </>
                          )}
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
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </StyledWrapper>
  );
};

export default EditableTable;
