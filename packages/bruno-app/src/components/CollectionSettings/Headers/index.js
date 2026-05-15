import React, { useState, useCallback, useRef } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'providers/Theme';
import { setCollectionHeaders } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import SingleLineEditor from 'components/SingleLineEditor';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';
import { headers as StandardHTTPHeaders } from 'know-your-http-well';
import { MimeTypes } from 'utils/codemirror/autocompleteConstants';
import BulkEditor from 'components/BulkEditor/index';
import Button from 'ui/Button';
import { headerNameRegex, headerValueRegex } from 'utils/common/regex';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';

const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const Headers = ({ collection }) => {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const headers = collection.draft?.root
    ? get(collection, 'draft.root.request.headers', [])
    : get(collection, 'root.request.headers', []);
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `collection-headers-scroll-${collection.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.collection-settings-content', onChange: setScroll, initialValue: scroll });

  // Get column widths from Redux
  const focusedTab = tabs?.find((t) => t.uid === activeTabUid);
  const collectionHeadersWidths = focusedTab?.tableColumnWidths?.['collection-headers'] || {};

  const handleColumnWidthsChange = (tableId, widths) => {
    dispatch(updateTableColumnWidths({ uid: activeTabUid, tableId, widths }));
  };

  const toggleBulkEditMode = () => {
    setIsBulkEditMode(!isBulkEditMode);
  };

  const handleHeadersChange = useCallback((updatedHeaders) => {
    dispatch(setCollectionHeaders({ collectionUid: collection.uid, headers: updatedHeaders }));
  }, [dispatch, collection.uid]);

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

  const getRowError = useCallback((row, index, key) => {
    if (key === 'name') {
      if (!row.name || row.name.trim() === '') return null;
      if (!headerNameRegex.test(row.name)) {
        return t('COLLECTION_HEADERS.HEADER_NAME_ERROR');
      }
    }
    if (key === 'value') {
      if (!row.value) return null;
      if (!headerValueRegex.test(row.value)) {
        return t('COLLECTION_HEADERS.HEADER_VALUE_ERROR');
      }
    }
    return null;
  }, []);

  const columns = [
    {
      key: 'name',
      name: t('COLLECTION_HEADERS.NAME'),
      isKeyField: true,
      placeholder: t('COLLECTION_HEADERS.NAME'),
      width: '30%',
      render: ({ value, onChange }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(newValue) => onChange(newValue.replace(/[\r\n]/g, ''))}
          autocomplete={headerAutoCompleteList}
          collection={collection}
          placeholder={!value ? t('COLLECTION_HEADERS.NAME') : ''}
        />
      )
    },
    {
      key: 'value',
      name: t('COLLECTION_HEADERS.VALUE'),
      placeholder: t('COLLECTION_HEADERS.VALUE'),
      render: ({ value, onChange }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={onChange}
          collection={collection}
          autocomplete={MimeTypes}
          placeholder={!value ? t('COLLECTION_HEADERS.VALUE') : ''}
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
      <StyledWrapper className="h-full w-full">
        <div className="text-xs mb-4 text-muted">
          {t('COLLECTION_HEADERS.DESCRIPTION')}
        </div>
        <BulkEditor
          params={headers}
          onChange={handleHeadersChange}
          onToggle={toggleBulkEditMode}
          onSave={handleSave}
        />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="h-full w-full" ref={wrapperRef}>
      <div className="text-xs mb-4 text-muted">
        {t('COLLECTION_HEADERS.DESCRIPTION')}
      </div>
      <EditableTable
        tableId="collection-headers"
        columns={columns}
        rows={headers}
        onChange={handleHeadersChange}
        defaultRow={defaultRow}
        getRowError={getRowError}
        columnWidths={collectionHeadersWidths}
        onColumnWidthsChange={(widths) => handleColumnWidthsChange('collection-headers', widths)}
        initialScroll={scroll}
      />
      <div className="flex justify-end mt-2">
        <button className="text-link select-none" data-testid="bulk-edit-toggle" onClick={toggleBulkEditMode}>
          {t('COLLECTION_HEADERS.BULK_EDIT')}
        </button>
      </div>
      <div className="mt-6">
        <Button type="submit" size="sm" onClick={handleSave}>
          {t('COMMON.SAVE')}
        </Button>
      </div>
    </StyledWrapper>
  );
};

export default Headers;
