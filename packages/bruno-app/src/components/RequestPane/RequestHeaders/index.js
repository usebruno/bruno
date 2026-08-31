import React, { useState, useCallback, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import {
  IconAlertTriangle,
  IconChevronDown,
  IconChevronRight,
  IconExternalLink,
  IconEye,
  IconEyeOff,
  IconInfoCircle
} from '@tabler/icons';
import { BRUNO_DEFAULT_HEADERS, getBrunoRuntimeUserAgent } from '@usebruno/common';
import { useTheme } from 'providers/Theme';
import {
  moveRequestHeader,
  setRequestHeaders,
  updateItemSettings,
  updateSettingsSelectedTab,
  updatedFolderSettingsSelectedTab
} from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { addTab, setFocusTableRow, updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import { Tooltip } from 'react-tooltip';
import SingleLineEditor from 'components/SingleLineEditor';
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
import { getInheritedHeaders } from './getInheritedHeaders';

export { getInheritedHeaders } from './getInheritedHeaders';

const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const ROW_TYPE = {
  REQUEST: 'request',
  DEFAULT: 'default',
  INHERITED: 'inherited',
  SECTION: 'section'
};

const isRequestRow = (row) => !row.rowType || row.rowType === ROW_TYPE.REQUEST;

/**
 * Hover hint matching the environment variable tooltips. Portaled to the
 * document so table cells (`overflow: hidden`, 35px tall) cannot clip a
 * wrapped second line.
 */
const HEADER_HINT_STYLE = {
  maxWidth: 220,
  whiteSpace: 'normal',
  overflowWrap: 'break-word',
  wordWrap: 'break-word'
};

const HeaderHint = ({ id, text, className, place = 'top', testId, tooltipTestId, children }) => (
  <>
    <span id={id} className={className} data-testid={testId}>
      {children}
    </span>
    {createPortal(
      <Tooltip
        anchorId={id}
        className="tooltip-mod"
        content={text}
        place={place}
        positionStrategy="fixed"
        opacity={1}
        style={HEADER_HINT_STYLE}
        render={tooltipTestId ? ({ content }) => <span data-testid={tooltipTestId}>{content}</span> : undefined}
      />,
      document.body
    )}
  </>
);

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
  const [showInheritedHeaders, setShowInheritedHeaders] = usePersistedState({
    key: `request-show-inherited-headers-${item.uid}`,
    default: false
  });
  const [isInheritedHeadersExpanded, setIsInheritedHeadersExpanded] = usePersistedState({
    key: `request-inherited-headers-expanded-${item.uid}`,
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

  const inheritedHeaders = useMemo(
    () => isHttpRequest ? getInheritedHeaders(collection, item) : [],
    [collection, isHttpRequest, item]
  );

  const allInheritedHeaders = useMemo(
    () => [...defaultHeaders, ...inheritedHeaders],
    [defaultHeaders, inheritedHeaders]
  );

  const tableRows = useMemo(() => {
    if (!isHttpRequest) {
      return headers || [];
    }

    const requestRows = (headers || []).map((header) => ({ ...header, rowType: ROW_TYPE.REQUEST }));

    // Hide inherited and runtime-default headers until explicitly requested.
    if (!showInheritedHeaders) {
      return requestRows;
    }

    return [
      {
        uid: 'inherited-headers-section',
        rowType: ROW_TYPE.SECTION,
        section: ROW_TYPE.INHERITED,
        label: 'Inherited Headers',
        count: allInheritedHeaders.length,
        expanded: isInheritedHeadersExpanded
      },
      ...(isInheritedHeadersExpanded ? allInheritedHeaders : []),
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
    allInheritedHeaders,
    headers,
    isInheritedHeadersExpanded,
    isHttpRequest,
    isRequestHeadersExpanded,
    showInheritedHeaders
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
    if (row.rowType === ROW_TYPE.INHERITED) {
      return;
    }

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

    const toggle = row.section === ROW_TYPE.INHERITED
      ? () => setIsInheritedHeadersExpanded(!isInheritedHeadersExpanded)
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
  }, [isInheritedHeadersExpanded, isRequestHeadersExpanded, setIsInheritedHeadersExpanded, setIsRequestHeadersExpanded]);

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

  const inheritedDescriptionColumn = createDescriptionColumn({
    theme: storedTheme,
    collection,
    item,
    readOnly: true
  });

  // When clicking an inherited header to see its source, the destination table
  // scrolls to the header and flashes it.
  const navigateToHeaderSource = useCallback((source, header) => {
    const isFolder = source.type === 'folder';
    const targetUid = isFolder ? source.uid : collection.uid;

    dispatch(addTab({
      uid: targetUid,
      collectionUid: collection.uid,
      type: isFolder ? 'folder-settings' : 'collection-settings'
    }));

    if (isFolder) {
      dispatch(updatedFolderSettingsSelectedTab({
        collectionUid: collection.uid,
        folderUid: source.uid,
        tab: 'headers'
      }));
    } else {
      dispatch(updateSettingsSelectedTab({
        collectionUid: collection.uid,
        tab: 'headers'
      }));
    }

    dispatch(setFocusTableRow({
      uid: targetUid,
      tableId: isFolder ? 'folder-headers' : 'collection-headers',
      rowUid: header.sourceRowUid,
      rowName: header.name,
      requestedAt: Date.now()
    }));
  }, [collection.uid, dispatch]);

  const renderInheritedHeaderAction = useCallback((row) => {
    if (row.rowType === ROW_TYPE.INHERITED) {
      const sourceName = row.source.name || 'Unnamed';
      const sourceLabel = row.source.type === 'folder'
        ? `folder “${sourceName}”`
        : `collection “${sourceName}”`;

      return (
        <HeaderHint
          id={`inherited-header-source-hint-${row.uid}`}
          text={`Open headers in ${sourceLabel}`}
          className="inherited-header-source"
          place="top-end"
        >
          <button
            type="button"
            aria-label={`Open headers in ${sourceLabel}`}
            data-testid={`inherited-header-source-${(row.name || 'unnamed').toLowerCase()}`}
            onClick={() => navigateToHeaderSource(row.source, row)}
          >
            <IconExternalLink size={16} strokeWidth={1.5} />
          </button>
        </HeaderHint>
      );
    }

    if (row.rowType !== ROW_TYPE.DEFAULT) {
      return null;
    }

    return (
      <HeaderHint
        id={`default-header-info-hint-${row.uid}`}
        text={row.omittable
          ? 'Automatically added at runtime'
          : 'Required by HTTP, cannot be omitted'}
        className="default-header-info"
        testId={`default-header-info-${row.name.toLowerCase()}`}
        tooltipTestId={`default-header-info-tooltip-${row.name.toLowerCase()}`}
        place="top-end"
      >
        <IconInfoCircle
          size={16}
          strokeWidth={1.5}
        />
      </HeaderHint>
    );
  }, [navigateToHeaderSource]);

  const rowConfig = useMemo(() => ({
    isEditable: isRequestRow,
    isCheckboxDisabled: (row) => row.rowType === ROW_TYPE.INHERITED
      || (row.rowType === ROW_TYPE.DEFAULT && !row.omittable),
    className: (row) => (row.rowType ? `${row.rowType}-header-row` : ''),
    testId: (row) => {
      if (row.rowType === ROW_TYPE.SECTION) return `${row.section}-headers-section-row`;
      if (row.rowType === ROW_TYPE.DEFAULT) return `default-header-row-${row.name.toLowerCase()}`;
      if (row.rowType === ROW_TYPE.INHERITED) {
        return row.name ? `inherited-header-row-${row.name.toLowerCase()}` : 'inherited-header-row';
      }
      return row.name ? `request-header-row-${row.name.toLowerCase()}` : 'request-header-add-row';
    },
    renderFullWidth: isHttpRequest && showInheritedHeaders ? renderSectionRow : undefined,
    renderActionCell: isHttpRequest && showInheritedHeaders ? renderInheritedHeaderAction : undefined
  }), [isHttpRequest, showInheritedHeaders, renderSectionRow, renderInheritedHeaderAction]);

  // Rendered through the editor so templated values keep variable highlighting
  // and the hover popover that plain text cannot provide.
  const renderInheritedValue = (value) => (
    <SingleLineEditor
      value={value || ''}
      theme={storedTheme}
      collection={collection}
      item={item}
      readOnly
    />
  );

  const columns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      placeholder: 'Name',
      width: '20%',
      render: ({ row, value, onChange }) => {
        if (row.rowType === ROW_TYPE.INHERITED) {
          return (
            <div className="header-name-cell">
              {renderInheritedValue(value)}
            </div>
          );
        }

        if (row.rowType === ROW_TYPE.DEFAULT) {
          return (
            <div className="header-name-cell">
              <span className="default-header-value">{value}</span>
              {row.overridden && (
                <HeaderHint
                  id={`default-header-conflict-hint-${row.uid}`}
                  text="Overridden by a request header"
                  className="header-conflict-icon"
                  testId={`default-header-conflict-${row.name.toLowerCase()}`}
                  tooltipTestId={`default-header-conflict-tooltip-${row.name.toLowerCase()}`}
                  place="top-start"
                >
                  <IconAlertTriangle size={16} strokeWidth={1.5} />
                </HeaderHint>
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
              <HeaderHint
                id={`request-header-conflict-hint-${row.uid}`}
                text="Overrides Bruno's default header"
                className="header-conflict-icon"
                testId={`request-header-conflict-${row.name.toLowerCase()}`}
                tooltipTestId={`request-header-conflict-tooltip-${row.name.toLowerCase()}`}
                place="top-start"
              >
                <IconAlertTriangle size={16} strokeWidth={1.5} />
              </HeaderHint>
            )}
          </div>
        );
      }
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      render: ({ row, value, onChange }) => {
        if (row.rowType === ROW_TYPE.INHERITED) {
          return renderInheritedValue(value);
        }

        return row.rowType === ROW_TYPE.DEFAULT
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
            );
      }
    },
    {
      ...descriptionColumn,
      render: (cellProps) => {
        if (cellProps.row.rowType === ROW_TYPE.INHERITED) {
          return inheritedDescriptionColumn.render(cellProps);
        }

        return cellProps.row.rowType && cellProps.row.rowType !== ROW_TYPE.REQUEST
          ? null
          : descriptionColumn.render(cellProps);
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
        testId="request-headers-table"
        columns={columns}
        rows={tableRows}
        onChange={handleHeadersChange}
        defaultRow={defaultRow}
        getRowError={getRowError}
        reorderable={true}
        showAddRow={!isHttpRequest || !showInheritedHeaders || isRequestHeadersExpanded}
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
              className="btn-action toggle-inherited-headers select-none flex items-center gap-1"
              data-testid="toggle-inherited-headers"
              onClick={() => setShowInheritedHeaders(!showInheritedHeaders)}
            >
              {showInheritedHeaders
                ? <IconEyeOff size={16} strokeWidth={1.5} />
                : <IconEye size={16} strokeWidth={1.5} />}
              <span>
                {showInheritedHeaders
                  ? 'Hide Inherited Headers'
                  : `Show Inherited Headers (${allInheritedHeaders.length})`}
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
