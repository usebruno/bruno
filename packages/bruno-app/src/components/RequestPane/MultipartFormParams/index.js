import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { IconUpload, IconX, IconFile, IconChevronDown } from '@tabler/icons';
import {
  moveMultipartFormParam,
  setMultipartFormParams
} from 'providers/ReduxStore/slices/collections';
import { browseFiles } from 'providers/ReduxStore/slices/collections/actions';
import MultiLineEditor from 'components/MultiLineEditor';
import SingleLineEditor from 'components/SingleLineEditor';
import Dropdown from 'components/Dropdown';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import EditableTable from 'components/EditableTable';
import StyledWrapper, { OverflowList } from './StyledWrapper';
import path from 'utils/common/path';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';
import { isWindowsOS } from 'utils/common/platform';

const basename = (filePath) => {
  if (!filePath) return '';
  const separator = isWindowsOS() ? '\\' : '/';
  return String(filePath).split(separator).pop() || String(filePath);
};

const MIN_CHIP_W = 75;
const CHIP_GAP = 4;
const UPLOAD_RESERVE = 28;
const MORE_CHIP_RESERVE = 56;

const FileChipsCell = ({ files, onRemove, onAdd }) => {
  const containerRef = useRef(null);
  const [visibleCount, setVisibleCount] = useState(files.length);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    // Measure the td (column-width, stable) rather than the content-sized cell, which would feed back on visibleCount.
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

  const renderChip = (filePath, idx, opts = {}) => (
    <div
      key={`${filePath}-${idx}`}
      className={`file-chip${opts.fullWidth ? ' file-chip-row' : ''}`}
      title={filePath}
    >
      <IconFile size={14} stroke={1.5} className="file-chip-icon" />
      <span className="file-chip-name">{basename(filePath)}</span>
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
    </div>
  );

  const renderOverflowList = (list) => (
    <OverflowList>
      {list.map((p, i) => (
        <div key={`o-${p}-${i}`} className="overflow-row" title={p}>
          <IconFile size={14} stroke={1.5} className="overflow-row-icon" />
          <span className="overflow-row-name">{basename(p)}</span>
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
        </div>
      ))}
    </OverflowList>
  );

  const collapsed = visibleCount === 0 && files.length > 0;

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
      <button type="button" className="upload-btn ml-1" onClick={onAdd} title="Add files">
        <IconUpload size={16} />
      </button>
    </div>
  );
};

const MultipartFormParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `request-body-multipartForm-scroll-${item.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.flex-boundary', onChange: setScroll, initialValue: scroll });
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const params = item.draft ? get(item, 'draft.request.body.multipartForm') : get(item, 'request.body.multipartForm');

  // Get column widths from Redux
  const focusedTab = tabs?.find((t) => t.uid === activeTabUid);
  const multipartFormWidths = focusedTab?.tableColumnWidths?.['multipart-form'] || {};

  const handleColumnWidthsChange = (tableId, widths) => {
    dispatch(updateTableColumnWidths({ uid: activeTabUid, tableId, widths }));
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleParamsChange = useCallback((updatedParams) => {
    dispatch(setMultipartFormParams({
      collectionUid: collection.uid,
      itemUid: item.uid,
      params: updatedParams
    }));
  }, [dispatch, collection.uid, item.uid]);

  const handleParamDrag = useCallback(({ updateReorderedItem }) => {
    dispatch(moveMultipartFormParam({
      collectionUid: collection.uid,
      itemUid: item.uid,
      updateReorderedItem
    }));
  }, [dispatch, collection.uid, item.uid]);

  const handleBrowseFiles = useCallback((row, onChange) => {
    dispatch(browseFiles([], ['multiSelections']))
      .then((filePaths) => {
        const processedPaths = filePaths.map((filePath) => {
          const collectionDir = collection.pathname;
          if (filePath.startsWith(collectionDir)) {
            return path.relative(collectionDir, filePath);
          }
          return filePath;
        });

        const currentParams = item.draft
          ? get(item, 'draft.request.body.multipartForm')
          : get(item, 'request.body.multipartForm');
        const existsInParams = (currentParams || []).some((p) => p.uid === row.uid);
        let updatedParams;
        if (existsInParams) {
          updatedParams = currentParams.map((p) => {
            if (p.uid === row.uid) {
              return { ...p, type: 'file', value: processedPaths };
            }
            return p;
          });
        } else {
          updatedParams = [
            ...(currentParams || []),
            { uid: row.uid, name: row.name || '', enabled: true, type: 'file', value: processedPaths, contentType: '' }
          ];
        }
        handleParamsChange(updatedParams);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [dispatch, collection.pathname, item, handleParamsChange]);

  const handleRemoveFile = useCallback((row, filePathToRemove) => {
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
  }, [params, handleParamsChange]);

  const handleValueChange = useCallback((row, newValue, onChange) => {
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
  }, [params, handleParamsChange]);

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
      width: '30%'
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      width: '35%',
      render: ({ row, value, onChange }) => {
        const files = row.type === 'file' ? getFileList(value) : [];
        if (files.length > 0) {
          return (
            <FileChipsCell
              files={files}
              onRemove={(filePath) => handleRemoveFile(row, filePath)}
              onAdd={() => handleBrowseFiles(row, onChange)}
            />
          );
        }

        return (
          <div className="flex items-center value-cell">
            <div className="flex-1">
              <MultiLineEditor
                onSave={onSave}
                theme={storedTheme}
                value={value || ''}
                onChange={(newValue) => handleValueChange(row, newValue, onChange)}
                onRun={handleRun}
                allowNewlines={true}
                collection={collection}
                item={item}
                placeholder={!value ? 'Value' : ''}
              />
            </div>
            <button
              className="upload-btn ml-1"
              onClick={() => handleBrowseFiles(row, onChange)}
              title="Select file"
            >
              <IconUpload size={16} />
            </button>
          </div>
        );
      }
    },
    {
      key: 'contentType',
      name: 'Content-Type',
      placeholder: 'Auto',
      width: '20%',
      render: ({ value, onChange }) => (
        <SingleLineEditor
          onSave={onSave}
          theme={storedTheme}
          placeholder={!value ? 'Auto' : ''}
          value={value || ''}
          onChange={onChange}
          onRun={handleRun}
          collection={collection}
        />
      )
    }
  ];

  const defaultRow = {
    name: '',
    value: '',
    contentType: '',
    type: 'text'
  };

  return (
    <StyledWrapper className="w-full" ref={wrapperRef}>
      <EditableTable
        tableId="multipart-form"
        columns={columns}
        rows={params || []}
        onChange={handleParamsChange}
        defaultRow={defaultRow}
        reorderable={true}
        onReorder={handleParamDrag}
        columnWidths={multipartFormWidths}
        onColumnWidthsChange={(widths) => handleColumnWidthsChange('multipart-form', widths)}
        initialScroll={scroll}
      />
    </StyledWrapper>
  );
};

export default MultipartFormParams;
