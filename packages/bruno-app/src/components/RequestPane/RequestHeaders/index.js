import React, { useState, useCallback, useMemo, useRef } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronRight,
  IconEye,
  IconEyeOff,
  IconInfoCircle
} from '@tabler/icons';
import { BRUNO_DEFAULT_HEADERS, getBrunoRuntimeUserAgent } from '@usebruno/common';
import { useTheme } from 'providers/Theme';
import { moveRequestHeader, setRequestHeaders, updateItemSettings } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import SingleLineEditor from 'components/SingleLineEditor';
import ToolHint from 'components/ToolHint';
import EditableTable from 'components/EditableTable';
import { createDescriptionColumn } from 'components/EditableTable/descriptionColumn';
import StyledWrapper from './StyledWrapper';
import { headers as StandardHTTPHeaders } from 'know-your-http-well';
import { MimeTypes } from 'utils/codemirror/autocompleteConstants';
import BulkEditor from '../../BulkEditor';
import { headerNameRegex, headerValueRegex } from 'utils/common/regex';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';
import { version as appVersion } from '../../../../package.json';

const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const ROW_TYPE = {
  REQUEST: 'request',
  DEFAULT: 'default',
  SECTION: 'section'
};

const isRequestRow = (row) => !row.rowType || row.rowType === ROW_TYPE.REQUEST;

const getDefaultHeaderValue = (header, requestUrl) => {
  if (header.name === 'User-Agent') {
    return getBrunoRuntimeUserAgent(appVersion);
  }

  if (header.name === 'Host') {
    try {
      return new URL(requestUrl).host || header.previewValue;
    } catch {
      return header.previewValue;
    }
  }

  return header.previewValue || '';
};

const RequestHeaders = ({ item, collection, addHeaderText }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');
  const request = item.draft ? get(item, 'draft.request') : get(item, 'request');
  const settings = (item.draft ? get(item, 'draft.settings', {}) : get(item, 'settings', {})) || {};
  const isHttpRequest = item.type === 'http-request';
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [showDefaultHeaders, setShowDefaultHeaders] = usePersistedState({
    key: `request-show-default-headers-${item.uid}`,
    default: false
  });
  const [isDefaultHeadersExpanded, setIsDefaultHeadersExpanded] = usePersistedState({
    key: `request-default-headers-expanded-${item.uid}`,
    default: true
  });
  const [isRequestHeadersExpanded, setIsRequestHeadersExpanded] = usePersistedState({
    key: `request-headers-expanded-${item.uid}`,
    default: true
  });
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
    const requestHeaders = isHttpRequest
      ? updatedHeaders
          .filter((header) => header.rowType === ROW_TYPE.REQUEST || !header.rowType)
          .map(({ rowType, ...header }) => header)
      : updatedHeaders;

    dispatch(setRequestHeaders({
      collectionUid: collection.uid,
      itemUid: item.uid,
      headers: requestHeaders
    }));
  }, [dispatch, collection.uid, item.uid, isHttpRequest]);

  const handleHeaderDrag = useCallback(({ updateReorderedItem }) => {
    dispatch(moveRequestHeader({
      collectionUid: collection.uid,
      itemUid: item.uid,
      updateReorderedItem
    }));
  }, [dispatch, collection.uid, item.uid]);

  const omittedHeaderNames = useMemo(
    () => new Set((settings.omitHeaders || []).map((name) => String(name).toLowerCase())),
    [settings.omitHeaders]
  );

  const enabledRequestHeaderNames = useMemo(
    () => new Set((headers || [])
      .filter((header) => header.enabled !== false && header.name)
      .map((header) => header.name.toLowerCase())),
    [headers]
  );

  const enabledDefaultHeaderNames = useMemo(
    () => new Set(BRUNO_DEFAULT_HEADERS
      .map((header) => header.name.toLowerCase())
      .filter((name) => !omittedHeaderNames.has(name))),
    [omittedHeaderNames]
  );

  const defaultHeaders = useMemo(() => BRUNO_DEFAULT_HEADERS.map((header) => {
    const normalizedName = header.name.toLowerCase();
    const enabled = !omittedHeaderNames.has(normalizedName);

    return {
      uid: `bruno-default-${normalizedName}`,
      rowType: ROW_TYPE.DEFAULT,
      name: header.name,
      value: getDefaultHeaderValue(header, request?.url),
      enabled,
      omittable: header.omittable,
      overridden: enabled && enabledRequestHeaderNames.has(normalizedName)
    };
  }), [enabledRequestHeaderNames, omittedHeaderNames, request?.url]);

  const tableRows = useMemo(() => {
    if (!isHttpRequest) {
      return headers || [];
    }

    const requestRows = (headers || []).map((header) => ({ ...header, rowType: ROW_TYPE.REQUEST }));

    // Hide the defaults accordion.
    if (!showDefaultHeaders) {
      return requestRows;
    }

    return [
      {
        uid: 'default-headers-section',
        rowType: ROW_TYPE.SECTION,
        section: ROW_TYPE.DEFAULT,
        label: 'Inherited Headers',
        count: defaultHeaders.length,
        expanded: isDefaultHeadersExpanded
      },
      ...(isDefaultHeadersExpanded ? defaultHeaders : []),
      {
        uid: 'request-headers-section',
        rowType: ROW_TYPE.SECTION,
        section: ROW_TYPE.REQUEST,
        label: 'Request Headers',
        count: (headers || []).length,
        expanded: isRequestHeadersExpanded
      },
      ...(isRequestHeadersExpanded ? requestRows : [])
    ];
  }, [
    defaultHeaders,
    headers,
    isDefaultHeadersExpanded,
    isHttpRequest,
    isRequestHeadersExpanded,
    showDefaultHeaders
  ]);

  const updateOmitHeaders = useCallback((headerName, enabled) => {
    const normalizedName = headerName.toLowerCase();
    const nextOmitHeaders = enabled
      ? (settings.omitHeaders || []).filter((name) => String(name).toLowerCase() !== normalizedName)
      : [
          ...(settings.omitHeaders || []).filter((name) => String(name).toLowerCase() !== normalizedName),
          headerName
        ];

    dispatch(updateItemSettings({
      collectionUid: collection.uid,
      itemUid: item.uid,
      settings: {
        omitHeaders: nextOmitHeaders
      }
    }));
  }, [collection.uid, dispatch, item.uid, settings.omitHeaders]);

  const handleHeaderCheckboxChange = useCallback((row, checked) => {
    if (row.rowType === ROW_TYPE.DEFAULT) {
      updateOmitHeaders(row.name, checked);
      return;
    }

    const updatedHeaders = (headers || []).map((header) =>
      header.uid === row.uid ? { ...header, enabled: checked } : header
    );
    handleHeadersChange(updatedHeaders);
  }, [handleHeadersChange, headers, updateOmitHeaders]);

  const renderSectionRow = useCallback((row) => {
    if (row.rowType !== ROW_TYPE.SECTION) {
      return null;
    }

    const toggle = row.section === ROW_TYPE.DEFAULT
      ? () => setIsDefaultHeadersExpanded(!isDefaultHeadersExpanded)
      : () => setIsRequestHeadersExpanded(!isRequestHeadersExpanded);

    return (
      <button
        type="button"
        className="headers-section-toggle"
        data-testid={`${row.section}-headers-section-toggle`}
        aria-expanded={row.expanded}
        onClick={toggle}
      >
        {row.expanded ? <IconChevronDown size={16} /> : <IconChevronRight size={16} />}
        <span>{row.label} ({row.count})</span>
      </button>
    );
  }, [isDefaultHeadersExpanded, isRequestHeadersExpanded, setIsDefaultHeadersExpanded, setIsRequestHeadersExpanded]);

  const getRowError = useCallback((row, index, key) => {
    if (row.rowType && row.rowType !== ROW_TYPE.REQUEST) {
      return null;
    }

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

  const descriptionColumn = createDescriptionColumn({
    theme: storedTheme,
    onSave,
    onRun: handleRun,
    collection,
    item
  });

  const renderDefaultHeaderAction = useCallback((row) => {
    if (row.rowType !== ROW_TYPE.DEFAULT) {
      return null;
    }

    return (
      <ToolHint
        text={row.omittable
          ? 'Automatically added at runtime'
          : 'Required by HTTP, cannot be omitted'}
        toolhintId={`default-header-info-${row.uid}`}
        className="default-header-info"
        dataTestId={`default-header-info-${row.name.toLowerCase()}`}
        tooltipTestId={`default-header-info-tooltip-${row.name.toLowerCase()}`}
        place="bottom-end"
        positionStrategy="fixed"
        tooltipStyle={{ opacity: 1 }}
      >
        <IconInfoCircle
          size={16}
          strokeWidth={1.5}
        />
      </ToolHint>
    );
  }, []);

  const rowConfig = useMemo(() => ({
    isEditable: isRequestRow,
    isCheckboxDisabled: (row) => row.rowType === ROW_TYPE.DEFAULT && !row.omittable,
    className: (row) => (row.rowType ? `${row.rowType}-header-row` : ''),
    testId: (row) => {
      if (row.rowType === ROW_TYPE.SECTION) return `${row.section}-headers-section-row`;
      if (row.rowType === ROW_TYPE.DEFAULT) return `default-header-row-${row.name.toLowerCase()}`;
      return row.name ? `request-header-row-${row.name.toLowerCase()}` : 'request-header-add-row';
    },
    renderFullWidth: isHttpRequest && showDefaultHeaders ? renderSectionRow : undefined,
    renderActionCell: isHttpRequest && showDefaultHeaders ? renderDefaultHeaderAction : undefined
  }), [isHttpRequest, showDefaultHeaders, renderSectionRow, renderDefaultHeaderAction]);

  const columns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      placeholder: 'Name',
      width: '20%',
      render: ({ row, value, onChange }) => {
        if (row.rowType === ROW_TYPE.DEFAULT) {
          return (
            <div className="header-name-cell">
              <span className="default-header-value">{value}</span>
              {row.overridden && (
                <ToolHint
                  text="Overridden by a request header"
                  toolhintId={`default-header-conflict-${row.uid}`}
                  className="header-conflict-icon"
                  dataTestId={`default-header-conflict-${row.name.toLowerCase()}`}
                  tooltipTestId={`default-header-conflict-tooltip-${row.name.toLowerCase()}`}
                  place="bottom-start"
                  positionStrategy="fixed"
                  tooltipStyle={{ opacity: 1 }}
                >
                  <IconAlertTriangle size={16} strokeWidth={1.5} />
                </ToolHint>
              )}
            </div>
          );
        }

        return (
          <div className="header-name-cell">
            <SingleLineEditor
              value={value || ''}
              theme={storedTheme}
              onSave={onSave}
              onChange={(newValue) => onChange(newValue.replace(/[\r\n]/g, ''))}
              autocomplete={headerAutoCompleteList}
              onRun={handleRun}
              collection={collection}
              item={item}
              placeholder={!value ? 'Name' : ''}
            />
            {row.enabled !== false
              && row.name
              && enabledDefaultHeaderNames.has(row.name.toLowerCase()) && (
              <ToolHint
                text="Overrides Bruno's default header"
                toolhintId={`request-header-conflict-${row.uid}`}
                className="header-conflict-icon"
                dataTestId={`request-header-conflict-${row.name.toLowerCase()}`}
                tooltipTestId={`request-header-conflict-tooltip-${row.name.toLowerCase()}`}
                place="bottom-start"
                positionStrategy="fixed"
                tooltipStyle={{ opacity: 1 }}
              >
                <IconAlertTriangle size={16} strokeWidth={1.5} />
              </ToolHint>
            )}
          </div>
        );
      }
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      render: ({ row, value, onChange }) => row.rowType === ROW_TYPE.DEFAULT
        ? <span className="default-header-value">{value}</span>
        : (
            <SingleLineEditor
              value={value || ''}
              theme={storedTheme}
              onSave={onSave}
              onChange={onChange}
              onRun={handleRun}
              autocomplete={MimeTypes}
              collection={collection}
              item={item}
              placeholder={!value ? 'Value' : ''}
            />
          )
    },
    {
      ...descriptionColumn,
      render: (cellProps) => (cellProps.row.rowType === ROW_TYPE.DEFAULT
        ? null
        : descriptionColumn.render(cellProps))
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
        testId="request-headers-table"
        columns={columns}
        rows={tableRows}
        onChange={handleHeadersChange}
        defaultRow={defaultRow}
        getRowError={getRowError}
        reorderable={true}
        showAddRow={!isHttpRequest || !showDefaultHeaders || isRequestHeadersExpanded}
        initialScroll={scroll}
        onReorder={handleHeaderDrag}
        onCheckboxChange={isHttpRequest ? handleHeaderCheckboxChange : undefined}
        rowConfig={rowConfig}
        columnWidths={headersWidths}
        onColumnWidthsChange={(widths) => handleColumnWidthsChange('request-headers', widths)}
      />
      <div className="bulk-edit-bar flex items-center justify-between mt-2">
        <div>
          {isHttpRequest && (
            <button
              type="button"
              className="btn-action toggle-default-headers select-none flex items-center gap-1"
              data-testid="toggle-default-headers"
              onClick={() => setShowDefaultHeaders(!showDefaultHeaders)}
            >
              {showDefaultHeaders
                ? <IconEyeOff size={16} strokeWidth={1.5} />
                : <IconEye size={16} strokeWidth={1.5} />}
              <span>
                {showDefaultHeaders
                  ? 'Hide Inherited Headers'
                  : `Show Inherited Headers (${defaultHeaders.length})`}
              </span>
            </button>
          )}
        </div>
        <button className="btn-action text-link select-none" data-testid="bulk-edit-toggle" onClick={toggleBulkEditMode}>
          Bulk Edit
        </button>
      </div>
    </StyledWrapper>
  );
};

export default RequestHeaders;
