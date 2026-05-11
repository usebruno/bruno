import React, { useMemo, useCallback, useLayoutEffect, useRef, useState } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { IconUpload, IconX, IconFile, IconChevronDown } from '@tabler/icons';
import { updateResponseExampleMultipartFormParams } from 'providers/ReduxStore/slices/collections';
import { browseFiles } from 'providers/ReduxStore/slices/collections/actions';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import mime from 'mime-types';
import path from 'utils/common/path';
import EditableTable from 'components/EditableTable';
import MultiLineEditor from 'components/MultiLineEditor';
import SingleLineEditor from 'components/SingleLineEditor';
import Dropdown from 'components/Dropdown';
import StyledWrapper, { OverflowList } from './StyledWrapper';
import { isWindowsOS } from 'utils/common/platform';

const MIN_CHIP_W = 75;
const CHIP_GAP = 4;
const UPLOAD_RESERVE = 28;
const MORE_CHIP_RESERVE = 56;

const basename = (filePath) => {
  if (!filePath) return '';
  const separator = isWindowsOS() ? '\\' : '/';
  return String(filePath).split(separator).pop() || String(filePath);
};

const FileChipsCell = ({ files, onRemove, onAdd, editMode }) => {
  const containerRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(files.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    const td = container.closest('td') || container.parentElement;
    if (!td) return;

    const compute = () => {
      const tdStyle = window.getComputedStyle(td);
      const padX = parseFloat(tdStyle.paddingLeft) + parseFloat(tdStyle.paddingRight);
      const total = td.clientWidth - padX;
      if (files.length === 0) {
        setVisibleCount(0);
        return;
      }

      const allAtMin = files.length * MIN_CHIP_W + Math.max(0, files.length - 1) * CHIP_GAP;
      if (allAtMin + UPLOAD_RESERVE <= total) {
        setVisibleCount(files.length);
        return;
      }

      const available = total - UPLOAD_RESERVE - MORE_CHIP_RESERVE;
      const n = Math.max(0, Math.floor((available + CHIP_GAP) / (MIN_CHIP_W + CHIP_GAP)));
      setVisibleCount(n);
    };

    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(td);
    return () => ro.disconnect();
  }, [files]);

  const visible = files.slice(0, visibleCount);
  const overflow = files.slice(visibleCount);
  const collapsed = visibleCount === 0 && files.length > 0;

  const renderChip = (filePath, idx, opts = {}) => (
    <div
      key={`${filePath}-${idx}`}
      className={`file-chip${opts.fullWidth ? ' file-chip-row' : ''}`}
      title={filePath}
    >
      <IconFile size={14} stroke={1.5} className="file-chip-icon" />
      <span className="file-chip-name">{basename(filePath)}</span>
      {editMode && (
        <button
          type="button"
          className="file-chip-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove(filePath);
          }}
          title="Remove file"
        >
          <IconX size={13} stroke={1.5} />
        </button>
      )}
    </div>
  );

  const renderOverflowList = (list) => (
    <OverflowList>
      {list.map((p, i) => (
        <div key={`o-${p}-${i}`} className="overflow-row" title={p}>
          <IconFile size={14} stroke={1.5} className="overflow-row-icon" />
          <span className="overflow-row-name">{basename(p)}</span>
          {editMode && (
            <button
              type="button"
              className="overflow-row-remove"
              onClick={(e) => {
                e.stopPropagation();
                onRemove(p);
              }}
              title="Remove file"
            >
              <IconX size={13} stroke={1.5} />
            </button>
          )}
        </div>
      ))}
    </OverflowList>
  );

  return (
    <div className="file-value-cell" ref={containerRef}>
      {collapsed ? (
        <>
          <Dropdown
            placement="bottom-start"
            appendTo={() => document.body}
            icon={(
              <button
                type="button"
                className="file-summary-chip"
                onClick={(e) => e.stopPropagation()}
                title={`${files.length} file${files.length > 1 ? 's' : ''}`}
              >
                <IconFile size={14} stroke={1.5} className="file-chip-icon" />
                <span>{files.length} file{files.length > 1 ? 's' : ''}</span>
                <IconChevronDown size={14} stroke={1.5} />
              </button>
            )}
          >
            {renderOverflowList(files)}
          </Dropdown>
          <div className="file-chips-row" />
        </>
      ) : (
        <>
          <div className="file-chips-row">
            {visible.map((p, i) => renderChip(p, i))}
          </div>
          {overflow.length > 0 && (
            <Dropdown
              placement="bottom-end"
              appendTo={() => document.body}
              icon={(
                <button
                  type="button"
                  className="file-more-chip"
                  onClick={(e) => e.stopPropagation()}
                  title={`${overflow.length} more file${overflow.length > 1 ? 's' : ''}`}
                >
                  +{overflow.length} more
                </button>
              )}
            >
              {renderOverflowList(overflow)}
            </Dropdown>
          )}
        </>
      )}
      {editMode && (
        <button type="button" className="upload-btn ml-1" onClick={onAdd} title="Add files">
          <IconUpload size={16} />
        </button>
      )}
    </div>
  );
};

const ResponseExampleMultipartFormParams = ({ item, collection, exampleUid, editMode = false }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  // Get column widths from Redux
  const focusedTab = tabs?.find((t) => t.uid === activeTabUid);
  const multipartFormWidths = focusedTab?.tableColumnWidths?.['example-multipart-form'] || {};

  const handleColumnWidthsChange = (tableId, widths) => {
    dispatch(updateTableColumnWidths({ uid: activeTabUid, tableId, widths }));
  };

  const params = useMemo(() => {
    return item.draft
      ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.request?.body?.multipartForm || []
      : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.request?.body?.multipartForm || [];
  }, [item, exampleUid]);

  const handleParamsChange = useCallback((updatedParams) => {
    if (!editMode) return;

    dispatch(updateResponseExampleMultipartFormParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: updatedParams
    }));
  }, [editMode, dispatch, item.uid, collection.uid, exampleUid]);

  const handleBrowseFiles = useCallback((row, onChange) => {
    if (!editMode) return;

    dispatch(browseFiles([], ['multiSelections']))
      .then((filePaths) => {
        if (!Array.isArray(filePaths) || filePaths.length === 0) return;

        const processedPaths = filePaths.map((filePath) => {
          const collectionDir = collection.pathname;
          if (filePath.startsWith(collectionDir)) {
            return path.relative(collectionDir, filePath);
          }
          return filePath;
        });

        const currentParams = params || [];
        const existingParam = currentParams.find((p) => p.uid === row.uid);
        const existingValue = existingParam && existingParam.type === 'file' && Array.isArray(existingParam.value)
          ? existingParam.value
          : [];
        const merged = [...existingValue];
        for (const p of processedPaths) {
          if (!merged.includes(p)) merged.push(p);
        }

        let updatedParams;
        if (existingParam) {
          updatedParams = currentParams.map((p) => {
            if (p.uid === row.uid) {
              const updated = { ...p, type: 'file', value: merged };
              if (merged.length > 0 && !p.contentType) {
                const contentType = mime.contentType(path.extname(merged[0]));
                updated.contentType = contentType || '';
              }
              return updated;
            }
            return p;
          });
        } else {
          const newParam = {
            uid: row.uid,
            name: row.name || '',
            type: 'file',
            value: merged,
            contentType: '',
            enabled: true
          };
          if (merged.length > 0) {
            const contentType = mime.contentType(path.extname(merged[0]));
            newParam.contentType = contentType || '';
          }
          updatedParams = [...currentParams, newParam];
        }

        handleParamsChange(updatedParams);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [editMode, dispatch, collection.pathname, params, handleParamsChange]);

  const handleRemoveFile = useCallback((row, filePathToRemove) => {
    if (!editMode) return;
    const currentParams = params || [];
    const target = currentParams.find((p) => p.uid === row.uid);
    if (!target || target.type !== 'file') return;
    const currentValue = Array.isArray(target.value)
      ? target.value
      : (target.value ? [target.value] : []);
    const nextValue = currentValue.filter((p) => p !== filePathToRemove);

    const updatedParams = currentParams.map((p) => {
      if (p.uid !== row.uid) return p;
      if (nextValue.length === 0) {
        return { ...p, type: 'text', value: '' };
      }
      return { ...p, type: 'file', value: nextValue };
    });
    handleParamsChange(updatedParams);
  }, [editMode, params, handleParamsChange]);

  const handleValueChange = useCallback((row, newValue, onChange) => {
    if (!editMode) return;

    const currentParams = params || [];
    const existingParam = currentParams.find((p) => p.uid === row.uid);
    if (existingParam) {
      const updatedParams = currentParams.map((p) => {
        if (p.uid === row.uid) {
          return { ...p, type: 'text', value: newValue };
        }
        return p;
      });
      handleParamsChange(updatedParams);
    } else {
      onChange(newValue);
    }
  }, [editMode, params, handleParamsChange]);

  const handleParamDrag = useCallback(({ updateReorderedItem }) => {
    if (!editMode) return;

    const reorderedParams = updateReorderedItem.map((uid) => {
      return params.find((p) => p.uid === uid);
    });

    dispatch(updateResponseExampleMultipartFormParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: reorderedParams
    }));
  }, [editMode, dispatch, item.uid, collection.uid, exampleUid, params]);

  const getFileList = (filePaths) => {
    if (!filePaths || (Array.isArray(filePaths) && filePaths.length === 0)) {
      return [];
    }
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    return paths.filter((v) => v != null && v !== '');
  };

  const columns = [
    {
      key: 'name',
      name: 'Key',
      isKeyField: true,
      placeholder: 'Key',
      width: '30%',
      readOnly: !editMode
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      width: '40%',
      readOnly: !editMode,
      render: ({ row, value, onChange }) => {
        const fileList = row.type === 'file' ? getFileList(value) : [];
        if (fileList.length > 0) {
          return (
            <FileChipsCell
              files={fileList}
              onRemove={(filePath) => handleRemoveFile(row, filePath)}
              onAdd={() => handleBrowseFiles(row, onChange)}
              editMode={editMode}
            />
          );
        }

        return (
          <div className="flex items-center value-cell">
            <div className="flex-1">
              <MultiLineEditor
                onSave={() => {}}
                theme={storedTheme}
                value={value || ''}
                onChange={(newValue) => handleValueChange(row, newValue, onChange)}
                onRun={() => {}}
                allowNewlines={true}
                collection={collection}
                item={item}
                readOnly={!editMode}
                placeholder={!value ? 'Value' : ''}
              />
            </div>
            {editMode && (
              <button
                className="upload-btn ml-1"
                onClick={() => handleBrowseFiles(row, onChange)}
                title="Select file"
              >
                <IconUpload size={16} />
              </button>
            )}
          </div>
        );
      }
    },
    {
      key: 'contentType',
      name: 'Content-Type',
      placeholder: 'Auto',
      width: '30%',
      readOnly: !editMode,
      render: ({ value, onChange }) => (
        <SingleLineEditor
          onSave={() => {}}
          theme={storedTheme}
          placeholder={!value ? 'Auto' : ''}
          value={value || ''}
          onChange={onChange}
          onRun={() => {}}
          collection={collection}
          readOnly={!editMode}
        />
      )
    }
  ];

  const defaultRow = {
    name: '',
    value: '',
    contentType: '',
    enabled: true,
    type: 'text'
  };

  if (params.length === 0 && !editMode) {
    return null;
  }

  return (
    <StyledWrapper className="w-full mt-4">
      <EditableTable
        tableId="example-multipart-form"
        columnWidths={multipartFormWidths}
        onColumnWidthsChange={(widths) => handleColumnWidthsChange('example-multipart-form', widths)}
        columns={columns}
        rows={params || []}
        onChange={handleParamsChange}
        defaultRow={defaultRow}
        reorderable={editMode}
        onReorder={handleParamDrag}
        showAddRow={editMode}
        showDelete={editMode}
        disableCheckbox={!editMode}
      />
    </StyledWrapper>
  );
};

export default ResponseExampleMultipartFormParams;
