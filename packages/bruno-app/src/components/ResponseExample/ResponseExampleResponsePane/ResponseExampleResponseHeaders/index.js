import React, { useState, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import get from 'lodash/get';
import { moveResponseExampleHeader, setResponseExampleHeaders, updateResponseExampleResponse } from 'providers/ReduxStore/slices/collections';
import { getBodyType } from 'utils/responseBodyProcessor';
import EditableTable from 'components/EditableTable';
import SingleLineEditor from 'components/SingleLineEditor';
import BulkEditor from 'components/BulkEditor';
import { headers as StandardHTTPHeaders } from 'know-your-http-well';
import { MimeTypes } from 'utils/codemirror/autocompleteConstants';
import StyledWrapper from './StyledWrapper';

const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const ResponseExampleResponseHeaders = ({ editMode, item, collection, exampleUid }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);

  const headers = useMemo(() => {
    return item.draft ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.response?.headers || [] : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.response?.headers || [];
  }, [item, exampleUid]);

  const response = useMemo(() => {
    return item.draft ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.response || {} : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.response || {};
  }, [item, exampleUid]);

  const handleHeadersChange = useCallback((updatedHeaders) => {
    if (!editMode) {
      return;
    }

    // Check if content-type header was updated
    const contentTypeHeader = updatedHeaders.find((h) => h.name?.toLowerCase() === 'content-type');
    const oldContentTypeHeader = headers.find((h) => h.name?.toLowerCase() === 'content-type');

    if (contentTypeHeader && oldContentTypeHeader && contentTypeHeader.value !== oldContentTypeHeader.value) {
      const newContentType = contentTypeHeader.value?.toLowerCase() || '';
      const newBodyType = getBodyType(newContentType);
      const currentBodyType = response.body?.type || 'text';

      // Only update if the body type has changed
      if (newBodyType !== currentBodyType) {
        dispatch(updateResponseExampleResponse({
          itemUid: item.uid,
          collectionUid: collection.uid,
          exampleUid: exampleUid,
          response: {
            body: {
              type: newBodyType,
              content: response.body?.content || ''
            }
          }
        }));
      }
    }

    dispatch(setResponseExampleHeaders({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      headers: updatedHeaders
    }));
  }, [editMode, dispatch, item.uid, collection.uid, exampleUid, headers, response]);

  const handleHeaderDrag = useCallback(({ updateReorderedItem }) => {
    if (!editMode) {
      return;
    }

    dispatch(moveResponseExampleHeader({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      updateReorderedItem
    }));
  }, [editMode, dispatch, item.uid, collection.uid, exampleUid]);

  const toggleBulkEditMode = () => {
    setIsBulkEditMode(!isBulkEditMode);
  };

  const handleBulkHeadersChange = (newHeaders) => {
    if (!editMode) {
      return;
    }
    const cleanedHeaders = newHeaders.map((header) => ({
      uid: header.uid,
      name: header.name,
      value: header.value
    }));

    dispatch(setResponseExampleHeaders({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      headers: cleanedHeaders
    }));
  };

  if (isBulkEditMode && editMode) {
    // Ensure all headers have enabled: true for bulk edit display
    const headersForBulkEdit = headers.map((header) => ({
      ...header,
      enabled: true
    }));
    return (
      <StyledWrapper className="w-full overflow-auto">
        <BulkEditor
          params={headersForBulkEdit}
          onChange={handleBulkHeadersChange}
          onToggle={toggleBulkEditMode}
        />
      </StyledWrapper>
    );
  }

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
          theme={storedTheme}
          onSave={() => {}}
          onChange={(newValue) => onChange(newValue.replace(/[\r\n]/g, ''))}
          autocomplete={headerAutoCompleteList}
          onRun={() => {}}
          collection={collection}
          readOnly={!editMode}
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
          theme={storedTheme}
          onSave={() => {}}
          onChange={onChange}
          onRun={() => {}}
          autocomplete={MimeTypes}
          allowNewlines={true}
          collection={collection}
          item={item}
          readOnly={!editMode}
          placeholder={!value ? 'Value' : ''}
        />
      )
    }
  ];

  const defaultRow = {
    name: '',
    value: ''
  };

  return (
    <StyledWrapper className="w-full px-4">
      <EditableTable
        columns={columns}
        rows={headers || []}
        onChange={handleHeadersChange}
        defaultRow={defaultRow}
        reorderable={editMode}
        onReorder={handleHeaderDrag}
        showAddRow={editMode}
        showCheckbox={false}
        showDelete={editMode}
      />
      {editMode && (
        <div className="flex justify-end mt-2 flex-shrink-0">
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

export default ResponseExampleResponseHeaders;
