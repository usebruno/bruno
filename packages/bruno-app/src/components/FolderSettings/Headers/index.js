import React, { useState, useCallback } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { setFolderHeaders } from 'providers/ReduxStore/slices/collections';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import SingleLineEditor from 'components/SingleLineEditor';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';
import { headers as StandardHTTPHeaders } from 'know-your-http-well';
import { MimeTypes } from 'utils/codemirror/autocompleteConstants';
import BulkEditor from 'components/BulkEditor/index';

const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const Headers = ({ collection, folder }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const headers = folder.draft
    ? get(folder, 'draft.request.headers', [])
    : get(folder, 'root.request.headers', []);
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);

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

  const columns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      placeholder: 'Name',
      width: '30%',
      render: ({ row, value, onChange, isLastEmptyRow }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={(newValue) => onChange(newValue.replace(/[\r\n]/g, ''))}
          autocomplete={headerAutoCompleteList}
          collection={collection}
          placeholder={isLastEmptyRow ? 'Name' : ''}
        />
      )
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      render: ({ row, value, onChange, isLastEmptyRow }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={handleSave}
          onChange={onChange}
          collection={collection}
          item={folder}
          autocomplete={MimeTypes}
          placeholder={isLastEmptyRow ? 'Value' : ''}
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
          Request headers that will be sent with every request inside this folder.
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
    <StyledWrapper className="w-full">
      <div className="text-xs mb-4 text-muted">
        Request headers that will be sent with every request inside this folder.
      </div>
      <EditableTable
        columns={columns}
        rows={headers}
        onChange={handleHeadersChange}
        defaultRow={defaultRow}
      />
      <div className="flex justify-end mt-2">
        <button className="text-link select-none" onClick={toggleBulkEditMode}>
          Bulk Edit
        </button>
      </div>
      <div className="mt-6">
        <button type="submit" className="submit btn btn-sm btn-secondary" onClick={handleSave}>
          Save
        </button>
      </div>
    </StyledWrapper>
  );
};

export default Headers;
