import React, { useState, useCallback, useRef } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { moveRequestHeader, setRequestHeaders } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import SingleLineEditor from 'components/SingleLineEditor';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';
import { headers as StandardHTTPHeaders } from 'know-your-http-well';
import { MimeTypes } from 'utils/codemirror/autocompleteConstants';
import BulkEditor from '../../BulkEditor';
import { headerNameRegex, headerValueRegex } from 'utils/common/regex';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';

const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const RequestHeaders = ({ item, collection, addHeaderText }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
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
    dispatch(setRequestHeaders({
      collectionUid: collection.uid,
      itemUid: item.uid,
      headers: updatedHeaders
    }));
  }, [dispatch, collection.uid, item.uid]);

  const handleHeaderDrag = useCallback(({ updateReorderedItem }) => {
    dispatch(moveRequestHeader({
      collectionUid: collection.uid,
      itemUid: item.uid,
      updateReorderedItem
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
      render: ({ value, onChange }) => (
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
      )
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      render: ({ value, onChange }) => (
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
        rows={headers || []}
        onChange={handleHeadersChange}
        defaultRow={defaultRow}
        getRowError={getRowError}
        reorderable={true}
        onReorder={handleHeaderDrag}
        columnWidths={headersWidths}
        onColumnWidthsChange={(widths) => handleColumnWidthsChange('request-headers', widths)}
      />
      <div className="bulk-edit-bar flex justify-end mt-2">
        <button className="btn-action text-link select-none" data-testid="bulk-edit-toggle" onClick={toggleBulkEditMode}>
          Bulk Edit
        </button>
      </div>
    </StyledWrapper>
  );
};

export default RequestHeaders;
