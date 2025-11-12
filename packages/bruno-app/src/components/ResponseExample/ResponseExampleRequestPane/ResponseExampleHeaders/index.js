import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { IconTrash } from '@tabler/icons';
import get from 'lodash/get';
import { addResponseExampleRequestHeader, updateResponseExampleRequestHeader, deleteResponseExampleRequestHeader, moveResponseExampleRequestHeader, setResponseExampleRequestHeaders } from 'providers/ReduxStore/slices/collections';
import Table from 'components/Table-v2';
import ReorderTable from 'components/ReorderTable';
import SingleLineEditor from 'components/SingleLineEditor';
import BulkEditor from 'components/BulkEditor';
import Checkbox from 'components/Checkbox';
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

  const handleAddHeader = () => {
    if (editMode) {
      dispatch(addResponseExampleRequestHeader({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid
      }));
    }
  };

  const handleHeaderValueChange = (e, header, type) => {
    if (editMode) {
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
        case 'enabled': {
          updatedHeader.enabled = e.target.checked;
          break;
        }
      }

      dispatch(updateResponseExampleRequestHeader({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid,
        header: updatedHeader
      }));
    }
  };

  const handleRemoveHeader = (header) => {
    if (editMode) {
      dispatch(deleteResponseExampleRequestHeader({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid,
        headerUid: header.uid
      }));
    }
  };

  const handleHeaderDrag = ({ updateReorderedItem }) => {
    if (editMode) {
      dispatch(moveResponseExampleRequestHeader({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid,
        updateReorderedItem
      }));
    }
  };

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
      <div className="mb-1 title text-xs font-bold">Headers</div>
      <Table
        headers={[
          { name: 'Key', accessor: 'key', width: '40%' },
          { name: 'Value', accessor: 'value', width: '60%' }
        ]}
      >
        <ReorderTable updateReorderedItem={handleHeaderDrag}>
          {headers && headers.length
            ? headers.map((header, index) => (
                <tr key={header.uid} data-uid={header.uid}>
                  <td className="flex relative">
                    <div className="flex items-center justify-center mr-3">
                      <Checkbox
                        checked={header.enabled === true}
                        disabled={!editMode}
                        onChange={(e) => handleHeaderValueChange(e, header, 'enabled')}
                        dataTestId={`header-checkbox-${index}`}
                      />
                    </div>
                    <SingleLineEditor
                      value={header.name || ''}
                      readOnly={!editMode}
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
                    />
                  </td>
                  <td>
                    <div className="flex items-center justify-center pl-4">
                      <SingleLineEditor
                        value={header.value || ''}
                        readOnly={!editMode}
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
        <div className="flex justify-between mt-2">
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

export default ResponseExampleHeaders;
