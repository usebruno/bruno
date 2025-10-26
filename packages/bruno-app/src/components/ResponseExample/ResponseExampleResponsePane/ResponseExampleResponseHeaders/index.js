import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { IconTrash } from '@tabler/icons';
import get from 'lodash/get';
import { addResponseExampleHeader, updateResponseExampleHeader, deleteResponseExampleHeader, moveResponseExampleHeader, setResponseExampleHeaders } from 'providers/ReduxStore/slices/collections';
import Table from 'components/Table-v2';
import ReorderTable from 'components/ReorderTable';
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

  const handleAddHeader = () => {
    if (!editMode) {
      return;
    }

    dispatch(addResponseExampleHeader({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid
    }));
  };

  const handleHeaderValueChange = (e, header, type) => {
    if (!editMode) {
      return;
    }

    const updatedHeader = { ...header };
    switch (type) {
      case 'name': {
        updatedHeader.name = e.target.value;
        break;
      }
      case 'value': {
        updatedHeader.value = e.target.value;
        break;
      }
    }

    dispatch(updateResponseExampleHeader({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      header: updatedHeader
    }));
  };

  const handleRemoveHeader = (header) => {
    if (!editMode) {
      return;
    }

    dispatch(deleteResponseExampleHeader({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      headerUid: header.uid
    }));
  };

  const handleHeaderDrag = ({ updateReorderedItem }) => {
    if (!editMode) {
      return;
    }

    dispatch(moveResponseExampleHeader({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      updateReorderedItem
    }));
  };

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

  return (
    <StyledWrapper className="w-full px-4">
      <Table
        headers={[
          { name: 'Key', accessor: 'key', width: '40%' },
          { name: 'Value', accessor: 'value', width: '60%' }
        ]}
      >
        <ReorderTable updateReorderedItem={handleHeaderDrag}>
          {headers && headers.length
            ? headers.map((header) => (
                <tr key={header.uid} data-uid={header.uid}>
                  <td className="flex relative">
                    <SingleLineEditor
                      value={header.name || ''}
                      theme={storedTheme}
                      onSave={() => {}}
                      onChange={(newValue) =>
                        handleHeaderValueChange({
                          target: {
                            value: newValue
                          }
                        },
                        header,
                        'name')}
                      autocomplete={headerAutoCompleteList}
                      onRun={() => {}}
                      collection={collection}
                      readOnly={!editMode}
                    />
                  </td>
                  <td>
                    <div className="flex items-center justify-center pl-4">
                      <SingleLineEditor
                        value={header.value || ''}
                        theme={storedTheme}
                        onSave={() => {}}
                        onChange={(newValue) =>
                          handleHeaderValueChange({
                            target: {
                              value: newValue
                            }
                          },
                          header,
                          'value')}
                        onRun={() => {}}
                        autocomplete={MimeTypes}
                        allowNewlines={true}
                        collection={collection}
                        item={item}
                        readOnly={!editMode}
                      />
                      {editMode && (
                        <button tabIndex="-1" onClick={() => handleRemoveHeader(header)} className="delete-button">
                          <IconTrash strokeWidth={1.5} size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            : null}
        </ReorderTable>
      </Table>

      {editMode && (
        <div className="flex justify-between mt-2 flex-shrink-0">
          <button
            className="btn-action text-link pr-2 py-3 select-none"
            onClick={handleAddHeader}
          >
            + Add Header
          </button>
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
