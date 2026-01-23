import React, { useState, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import get from 'lodash/get';
import { moveResponseExampleRequestHeader, setResponseExampleRequestHeaders } from 'providers/ReduxStore/slices/collections';
import EditableTable from 'components/EditableTable';
import SingleLineEditor from 'components/SingleLineEditor';
import BulkEditor from 'components/BulkEditor';
import { headers as StandardHTTPHeaders } from 'know-your-http-well';
import { MimeTypes } from 'utils/codemirror/autocompleteConstants';
import StyledWrapper from './StyledWrapper';

const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const ResponseExampleHeaders = ({ editMode, item, collection, exampleUid }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);

  const headers = useMemo(() => {
    return item.draft
      ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.request?.headers || []
      : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.request?.headers || [];
  }, [item, exampleUid]);

  const handleHeadersChange = useCallback((updatedHeaders) => {
    if (editMode) {
      dispatch(setResponseExampleRequestHeaders({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid,
        headers: updatedHeaders
      }));
    }
  }, [editMode, dispatch, item.uid, collection.uid, exampleUid]);

  const handleHeaderDrag = useCallback(({ updateReorderedItem }) => {
    if (editMode) {
      dispatch(moveResponseExampleRequestHeader({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid,
        updateReorderedItem
      }));
    }
  }, [editMode, dispatch, item.uid, collection.uid, exampleUid]);

  const toggleBulkEditMode = () => {
    setIsBulkEditMode(!isBulkEditMode);
  };

  const handleBulkHeadersChange = (newHeaders) => {
    if (editMode) {
      dispatch(setResponseExampleRequestHeaders({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid,
        headers: newHeaders
      }));
    }
  };

  const columns = [
    {
      key: 'name',
      name: 'Key',
      isKeyField: true,
      placeholder: 'Key',
      width: '40%',
      readOnly: !editMode,
      render: ({ value, onChange }) => (
        <SingleLineEditor
          value={value || ''}
          readOnly={!editMode}
          theme={storedTheme}
          onSave={() => {}}
          onChange={(newValue) => onChange(newValue.replace(/[\r\n]/g, ''))}
          autocomplete={headerAutoCompleteList}
          onRun={() => {}}
          collection={collection}
          placeholder={!value ? 'Key' : ''}
        />
      )
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      width: '60%',
      readOnly: !editMode,
      render: ({ value, onChange }) => (
        <SingleLineEditor
          value={value || ''}
          readOnly={!editMode}
          theme={storedTheme}
          onSave={() => {}}
          onChange={onChange}
          onRun={() => {}}
          autocomplete={MimeTypes}
          allowNewlines={true}
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
    enabled: true
  };

  if (isBulkEditMode && editMode) {
    return (
      <StyledWrapper className="w-full mt-3">
        <BulkEditor
          params={headers}
          onChange={handleBulkHeadersChange}
          onToggle={toggleBulkEditMode}
        />
      </StyledWrapper>
    );
  }

  if (headers.length === 0 && !editMode) {
    return null;
  }

  return (
    <StyledWrapper className="w-full mt-4">
      <div className="mb-3 title text-xs font-bold">Headers</div>
      <EditableTable
        columns={columns}
        rows={headers || []}
        onChange={handleHeadersChange}
        defaultRow={defaultRow}
        reorderable={editMode}
        onReorder={handleHeaderDrag}
        showAddRow={editMode}
        showDelete={editMode}
        disableCheckbox={!editMode}
      />
      {editMode && (
        <div className="flex justify-end mt-2">
          <button
            className="btn-action text-link select-none"
            onClick={toggleBulkEditMode}
          >
            Bulk Edit
          </button>
        </div>
      )}
    </StyledWrapper>
  );
};

export default ResponseExampleHeaders;
