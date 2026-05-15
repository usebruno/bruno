import React, { useState, useCallback, useRef } from 'react';
import get from 'lodash/get';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { setFolderHeaders } from 'providers/ReduxStore/slices/collections';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
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
import { useTranslation } from 'react-i18next';

const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const Headers = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const { t } = useTranslation();
  const { storedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const headers = folder.draft
    ? get(folder, 'draft.request.headers', [])
    : get(folder, 'root.request.headers', []);
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `folder-headers-scroll-${folder.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.folder-settings-content', onChange: setScroll, initialValue: scroll });

  // Get column widths from Redux
  const focusedTab = tabs?.find((t) => t.uid === activeTabUid);
  const folderHeadersWidths = focusedTab?.tableColumnWidths?.['folder-headers'] || {};

  const handleColumnWidthsChange = (tableId, widths) => {
    dispatch(updateTableColumnWidths({ uid: activeTabUid, tableId, widths }));
  };

  const toggleBulkEditMode = () => {
    setIsBulkEditMode(!isBulkEditMode);
  };

  const handleHeadersChange = useCallback((updatedHeaders) => {
    dispatch(setFolderHeaders({
      collectionUid: collection.uid,
      folderUid: folder.uid,
      headers: updatedHeaders
    }));
  }, [dispatch, collection.uid, folder.uid]);

  const handleSave = () => dispatch(saveFolderRoot(collection.uid, folder.uid));

  const getRowError = useCallback((row, index, key) => {
    if (key === 'name') {
      if (!row.name || row.name.trim() === '') return null;
      if (!headerNameRegex.test(row.name)) {
        return t('FOLDER_SETTINGS.HEADER_NAME_ERROR');
      }
    }
    if (key === 'value') {
      if (!row.value) return null;
      if (!headerValueRegex.test(row.value)) {
        return t('FOLDER_SETTINGS.HEADER_VALUE_ERROR');
      }
    }
    return null;
  }, [t]);

  const columns = [
    {
      key: 'name',
      name: t('FOLDER_SETTINGS.NAME'),
      isKeyField: true,
      placeholder: t('FOLDER_SETTINGS.NAME'),
      width: '30%',
      render: ({ value, onChange }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(newValue) => onChange(newValue.replace(/[\r\n]/g, ''))}
          autocomplete={headerAutoCompleteList}
          collection={collection}
          placeholder={!value ? t('FOLDER_SETTINGS.NAME') : ''}
        />
      )
    },
    {
      key: 'value',
      name: t('FOLDER_SETTINGS.VALUE'),
      placeholder: t('FOLDER_SETTINGS.VALUE'),
      render: ({ value, onChange }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={onChange}
          collection={collection}
          item={folder}
          autocomplete={MimeTypes}
          placeholder={!value ? t('FOLDER_SETTINGS.VALUE') : ''}
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
      <StyledWrapper className="w-full">
        <div className="text-xs mb-4 text-muted">
          {t('FOLDER_SETTINGS.HEADERS_DESCRIPTION')}
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
    <StyledWrapper className="w-full" ref={wrapperRef}>
      <div className="text-xs mb-4 text-muted">
        {t('FOLDER_SETTINGS.HEADERS_DESCRIPTION')}
      </div>
      <EditableTable
        tableId="folder-headers"
        columns={columns}
        rows={headers}
        onChange={handleHeadersChange}
        defaultRow={defaultRow}
        getRowError={getRowError}
        columnWidths={folderHeadersWidths}
        onColumnWidthsChange={(widths) => handleColumnWidthsChange('folder-headers', widths)}
        initialScroll={scroll}
      />
      <div className="flex justify-end mt-2">
        <button className="text-link select-none" data-testid="bulk-edit-toggle" onClick={toggleBulkEditMode}>
          {t('FOLDER_SETTINGS.BULK_EDIT')}
        </button>
      </div>
      <div className="mt-6">
        <Button type="submit" size="sm" onClick={handleSave}>
          {t('FOLDER_SETTINGS.SAVE')}
        </Button>
      </div>
    </StyledWrapper>
  );
};

export default Headers;
