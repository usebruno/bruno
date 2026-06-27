import React, { useState, useCallback, useRef, useEffect, useMemo } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { moveRequestHeader, setRequestHeaders } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateTableColumnWidths, updateRequestPaneTab } from 'providers/ReduxStore/slices/tabs';
import SingleLineEditor from 'components/SingleLineEditor';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';
import { headers as StandardHTTPHeaders } from 'know-your-http-well';
import { MimeTypes } from 'utils/codemirror/autocompleteConstants';
import BulkEditor from '../../BulkEditor';
import { headerNameRegex, headerValueRegex } from 'utils/common/regex';
import useLocalStorage from 'hooks/useLocalStorage';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';
import { findEnvironmentInCollection } from 'utils/collections';
import { resolveInheritedAuth } from 'utils/auth';
import { dryRunHttpRequest } from 'utils/network';
import { IconEye, IconEyeOff } from '@tabler/icons';

const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const RequestHeaders = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [showDynamicHeaders, setShowDynamicHeaders] = useLocalStorage('bruno.request.showDynamicHeaders', false);
  const [showAuthValue, setShowAuthValue] = useState(false);

  // Calculate dynamic headers via dry-run
  const activeRequest = item.draft ? item.draft.request : item.request;

  const ownHeaderNames = useMemo(
    () => new Set((headers || []).map((h) => h.name.trim().toLowerCase())),
    [headers]
  );

  const [dryRunHeaders, setDryRunHeaders] = useState({});

  const bodyMode = activeRequest.body?.mode;
  const itemAuthStr = JSON.stringify(activeRequest.auth || {});
  const collectionAuthStr = JSON.stringify(collection?.root?.request?.auth || {});
  const activeEnvironmentUid = collection?.activeEnvironmentUid;

  const authHeaderNames = useMemo(() => {
    const effectiveAuth = resolveInheritedAuth(item, collection)?.auth || {};
    const names = new Set(['authorization', 'x-wsse']);
    if (effectiveAuth.mode === 'apikey' && effectiveAuth.apikey?.placement === 'header' && effectiveAuth.apikey?.key) {
      names.add(effectiveAuth.apikey.key.toLowerCase());
    }
    return names;
  }, [item, collection]);

  useEffect(() => {
    let isMounted = true;
    const environment = findEnvironmentInCollection(collection, activeEnvironmentUid);

    dryRunHttpRequest(item, collection, environment, collection.runtimeVariables)
      .then((res) => {
        if (!isMounted) return;
        if (res?.error || !res?.headers) {
          setDryRunHeaders({});
          return;
        }
        setDryRunHeaders(res.headers);
      })
      .catch((error) => {
        console.error(error);
        if (isMounted) {
          setDryRunHeaders({});
        }
      });

    return () => { isMounted = false; };
  }, [item.uid, bodyMode, itemAuthStr, collectionAuthStr, activeEnvironmentUid]);

  const dynamicHeaders = useMemo(() => {
    return Object.entries(dryRunHeaders)
      .filter(([name]) => !ownHeaderNames.has(name.trim().toLowerCase()))
      .map(([name, value], index) => {
        const trimmedName = name.trim();
        let displayValue = typeof value === 'string' ? value.trim() : String(value).trim();
        const lowerName = trimmedName.toLowerCase();

        // Obscure timestamp, size, and dynamic signature headers that change on every execution
        if (['x-amz-date', 'date', 'content-length', 'request-start-time'].includes(lowerName)) {
          displayValue = '<calculated at runtime>';
        } else if (authHeaderNames.has(lowerName)) {
          if (!showAuthValue) {
            if (displayValue.includes('Credential=')) {
              // AWSv4 authorization contains the signature and date which changes every execution
              displayValue = '<calculated at runtime>';
            } else {
              // Obscure normal auth values with bullets if it has a bearer/basic prefix
              const parts = displayValue.split(' ');
              if (parts.length > 1) {
                displayValue = parts[0] + ' ' + '*'.repeat(16);
              } else {
                displayValue = '*'.repeat(16);
              }
            }
          }
        }

        return {
          uid: `dynamic-${trimmedName}-${index}`,
          name: trimmedName,
          value: displayValue,
          readOnly: true,
          isDynamic: true
        };
      });
  }, [dryRunHeaders, ownHeaderNames, authHeaderNames, showAuthValue]);

  const rows = useMemo(() => {
    return showDynamicHeaders ? [...dynamicHeaders, ...(headers || [])] : headers || [];
  }, [showDynamicHeaders, dynamicHeaders, headers]);

  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `request-headers-scroll-${item.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.flex-boundary', onChange: setScroll, initialValue: scroll });

  // Get column widths from Redux
  const focusedTab = tabs?.find((t) => t.uid === activeTabUid);
  const headersWidths = focusedTab?.tableColumnWidths?.['request-headers'] || {};

  const handleColumnWidthsChange = (tableId, widths) => {
    dispatch(updateTableColumnWidths({ uid: activeTabUid, tableId, widths }));
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleHeadersChange = useCallback((updatedHeaders) => {
    const ownUpdatedHeaders = updatedHeaders.filter((h) => !h.isDynamic);
    dispatch(setRequestHeaders({
      collectionUid: collection.uid,
      itemUid: item.uid,
      headers: ownUpdatedHeaders
    }));
  }, [dispatch, collection.uid, item.uid]);

  const handleHeaderDrag = useCallback(({ updateReorderedItem }) => {
    const validUids = updateReorderedItem.filter((uid) => !uid.startsWith('dynamic-'));

    dispatch(moveRequestHeader({
      collectionUid: collection.uid,
      itemUid: item.uid,
      updateReorderedItem: validUids
    }));
  }, [dispatch, collection.uid, item.uid]);

  const getRowError = useCallback((row, index, key) => {
    if (key === 'name') {
      if (!row.name || row.name.trim() === '') return null;
      if (!headerNameRegex.test(row.name)) {
        return 'Header name cannot contain spaces or newlines';
      }
    }
    if (key === 'value') {
      if (!row.value) return null;
      if (!headerValueRegex.test(row.value)) {
        return 'Header value cannot contain newlines';
      }
    }
    return null;
  }, []);

  const toggleBulkEditMode = () => {
    setIsBulkEditMode(!isBulkEditMode);
  };

  const columns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      placeholder: 'Name',
      width: '30%',
      render: ({ row, value, onChange }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          readOnly={row.readOnly}
          onSave={onSave}
          onChange={(newValue) => onChange(newValue.replace(/[\r\n]/g, ''))}
          autocomplete={headerAutoCompleteList}
          onRun={handleRun}
          collection={collection}
          item={item}
          placeholder={!value ? 'Name' : ''}
        />
      )
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      render: ({ row, value, onChange }) => {
        const isAuthHeader = row.name && authHeaderNames.has(row.name.toLowerCase()) && row.isDynamic;

        return (
          <div className={`relative flex w-full items-center ${isAuthHeader ? 'group' : ''}`}>
            <div className={`w-full ${isAuthHeader ? 'transition-opacity duration-200 group-hover:opacity-15' : ''}`}>
              <SingleLineEditor
                value={value || ''}
                theme={storedTheme}
                readOnly={row.readOnly}
                onSave={onSave}
                onChange={onChange}
                onRun={handleRun}
                autocomplete={MimeTypes}
                collection={collection}
                item={item}
                placeholder={!value ? 'Value' : ''}
              />
            </div>
            {isAuthHeader && (
              <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <div
                  className="cursor-pointer text-link text-xs whitespace-nowrap px-2 py-1 rounded"
                  onClick={() => dispatch(updateRequestPaneTab({ uid: item.uid, requestPaneTab: 'auth' }))}
                  data-testid="go-to-authorization"
                >
                  Go to Authorization
                </div>
                <div
                  className="cursor-pointer text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1 rounded"
                  onClick={() => setShowAuthValue(!showAuthValue)}
                  title={showAuthValue ? 'Hide value' : 'Show value'}
                  data-testid="reveal-auth-value"
                >
                  {showAuthValue ? <IconEyeOff size={16} strokeWidth={1.5} /> : <IconEye size={16} strokeWidth={1.5} />}
                </div>
              </div>
            )}
          </div>
        );
      }
    }
  ];

  const defaultRow = {
    name: '',
    value: '',
    description: ''
  };

  if (isBulkEditMode) {
    return (
      <StyledWrapper className="w-full mt-3">
        <BulkEditor
          params={headers}
          onChange={handleHeadersChange}
          onToggle={toggleBulkEditMode}
          onSave={onSave}
          onRun={handleRun}
        />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="w-full" ref={wrapperRef}>
      <EditableTable
        tableId="request-headers"
        columns={columns}
        rows={rows}
        onChange={handleHeadersChange}
        defaultRow={defaultRow}
        getRowError={getRowError}
        reorderable={true}
        initialScroll={scroll}
        onReorder={handleHeaderDrag}
        columnWidths={headersWidths}
        onColumnWidthsChange={(widths) => handleColumnWidthsChange('request-headers', widths)}
      />
      <div className="actions-bar flex justify-between gap-2 mt-2">
        {dynamicHeaders.length > 0 && (
          <button
            className="btn-action text-link select-none flex items-center gap-1"
            onClick={() => setShowDynamicHeaders(!showDynamicHeaders)}
            data-testid="dynamic-header-toggle"
          >
            {showDynamicHeaders ? <IconEye size={16} strokeWidth={1.5} /> : <IconEyeOff size={16} strokeWidth={1.5} />}
            <span>{showDynamicHeaders ? `Hide ${dynamicHeaders.length} dynamic headers` : `${dynamicHeaders.length} Hidden headers`}</span>
          </button>
        )}
        <button className="btn-action text-link select-none ml-auto" data-testid="bulk-edit-toggle" onClick={toggleBulkEditMode}>
          Bulk Edit
        </button>
      </div>
    </StyledWrapper>
  );
};

export default RequestHeaders;
