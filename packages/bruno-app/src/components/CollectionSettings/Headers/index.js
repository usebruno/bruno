import React, { useState, useCallback } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { setCollectionHeaders } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import SingleLineEditor from 'components/SingleLineEditor';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';
import { headers as StandardHTTPHeaders } from 'know-your-http-well';
import { MimeTypes } from 'utils/codemirror/autocompleteConstants';
import BulkEditor from 'components/BulkEditor/index';
import Button from 'ui/Button';
import { headerNameRegex, headerValueRegex } from 'utils/common/regex';

const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const Headers = ({ collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const headers = collection.draft?.root
    ? get(collection, 'draft.root.request.headers', [])
    : get(collection, 'root.request.headers', []);
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);

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
          onSave={handleSave}
          onChange={(newValue) => onChange(newValue.replace(/[\r\n]/g, ''))}
          autocomplete={headerAutoCompleteList}
          collection={collection}
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
          onSave={handleSave}
          onChange={onChange}
          collection={collection}
          autocomplete={MimeTypes}
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
      <StyledWrapper className="h-full w-full">
        <div className="text-xs mb-4 text-muted">
          Add request headers that will be sent with every request in this collection.
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
    <StyledWrapper className="h-full w-full">
      <div className="text-xs mb-4 text-muted">
        Add request headers that will be sent with every request in this collection.
      </div>
      <EditableTable
        columns={columns}
        rows={headers}
        onChange={handleHeadersChange}
        defaultRow={defaultRow}
        getRowError={getRowError}
      />
      <div className="flex justify-end mt-2">
        <button className="text-link select-none" onClick={toggleBulkEditMode}>
          Bulk Edit
        </button>
      </div>
      <div className="mt-6">
        <Button type="submit" size="sm" onClick={handleSave}>
          Save
        </Button>
      </div>
    </StyledWrapper>
  );
};

export default Headers;
