import React, { useState, useEffect } from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash } from '@tabler/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { addRequestHeader, updateRequestHeader, deleteRequestHeader, moveRequestHeader, setRequestHeaders } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';
import { headers as StandardHTTPHeaders } from 'know-your-http-well';
import { MimeTypes } from 'utils/codemirror/autocompleteConstants';
import Table from 'components/Table/index';
import ReorderTable from 'components/ReorderTable/index';
import BulkEditor from '../../BulkEditor';

const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const RequestHeaders = ({ item, collection, addHeaderText }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');
  
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  // Validate all headers whenever headers change
  useEffect(() => {
    if (!headers || !headers.length) {
      setValidationErrors({});
      return;
    }

    const newErrors = {};
    headers.forEach((header) => {
      // Validate name
      if (/[\r\n]/.test(header.name)) {
        newErrors[`${header.uid}-name`] = 'Key contains invalid newline characters.';
      } else if (/[\s]/.test(header.name)) {
        newErrors[`${header.uid}-name`] = 'Key contains invalid whitespace characters.';
      }

      // Validate value
      if (/[\r\n]/.test(header.value)) {
        newErrors[`${header.uid}-value`] = 'Value contains invalid newline characters.';
      }
    });

    setValidationErrors(newErrors);
  }, [headers]);

  const addHeader = () => {
    dispatch(
      addRequestHeader({
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  const handleHeaderValueChange = (e, _header, type) => {
    const header = cloneDeep(_header);
    const newErrors = { ...validationErrors };

    switch (type) {
      case 'name': {
        const value = e.target.value;

        // Check for newline characters first, then other whitespace
        if (/[\r\n]/.test(value)) {
          newErrors[`${header.uid}-name`] = 'Key contains invalid newline characters.';
        } else if (/[\s]/.test(value)) {
          newErrors[`${header.uid}-name`] = 'Key contains invalid whitespace characters.';
        } else {
          delete newErrors[`${header.uid}-name`];
        }

        header.name = value;
        break;
      }
      case 'value': {
        const value = e.target.value;

        // Check for newline characters
        if (/[\r\n]/.test(value)) {
          newErrors[`${header.uid}-value`] = 'Value contains invalid newline characters.';
        } else {
          delete newErrors[`${header.uid}-value`];
        }

        header.value = value;
        break;
      }
      case 'enabled': {
        header.enabled = e.target.checked;
        break;
      }
    }

    setValidationErrors(newErrors);
    dispatch(
      updateRequestHeader({
        header: header,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const handleRemoveHeader = (header) => {
    dispatch(
      deleteRequestHeader({
        headerUid: header.uid,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

    const handleHeaderDrag = ({ updateReorderedItem }) => {
      dispatch(
        moveRequestHeader({
          collectionUid: collection.uid,
          itemUid: item.uid,
          updateReorderedItem
        })
      );
    };

  const toggleBulkEditMode = () => {
    setIsBulkEditMode(!isBulkEditMode);
  };

  const handleBulkHeadersChange = (newHeaders) => {
    dispatch(setRequestHeaders({ collectionUid: collection.uid, itemUid: item.uid, headers: newHeaders }));
  };

  if (isBulkEditMode) {
    return (
      <StyledWrapper className="w-full mt-3">
        <BulkEditor
          params={headers}
          onChange={handleBulkHeadersChange}
          onToggle={toggleBulkEditMode}
          onSave={onSave}
          onRun={handleRun}
        />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="w-full">
      <Table
        headers={[
          { name: 'Key', accessor: 'key', width: '34%' },
          { name: 'Value', accessor: 'value', width: '46%' },
          { name: '', accessor: '', width: '20%' }
        ]}
      >
        <ReorderTable updateReorderedItem={handleHeaderDrag}>
        {headers && headers.length
            ? headers.map((header) => {
                return (
                  <tr key={header.uid} data-uid={header.uid}>
                    <td className='flex relative'>
                      <SingleLineEditor
                        value={header.name}
                        theme={storedTheme}
                        onSave={onSave}
                        onChange={(newValue) =>
                          handleHeaderValueChange(
                            {
                              target: {
                                value: newValue
                              }
                            },
                            header,
                            'name'
                          )
                        }
                        autocomplete={headerAutoCompleteList}
                        onRun={handleRun}
                        collection={collection}
                        validationError={validationErrors[`${header.uid}-name`]}
                      />
                    </td>
                    <td>
                      <SingleLineEditor
                        value={header.value}
                        theme={storedTheme}
                        onSave={onSave}
                        onChange={(newValue) =>
                          handleHeaderValueChange(
                            {
                              target: {
                                value: newValue
                              }
                            },
                            header,
                            'value'
                          )
                        }
                        onRun={handleRun}
                        autocomplete={MimeTypes}
                        collection={collection}
                        item={item}
                        validationError={validationErrors[`${header.uid}-value`]}
                      />
                    </td>
                    <td>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={header.enabled}
                          tabIndex="-1"
                          className="mr-3 mousetrap"
                          onChange={(e) => handleHeaderValueChange(e, header, 'enabled')}
                        />
                        <button tabIndex="-1" onClick={() => handleRemoveHeader(header)}>
                          <IconTrash strokeWidth={1.5} size={20} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            : null}
        </ReorderTable>
      </Table>
      <div className="flex justify-between mt-2">
        <button className="btn-action text-link pr-2 py-3 select-none" onClick={addHeader}>
          + {addHeaderText || 'Add Header'}
        </button>
        <button className="btn-action text-link select-none" onClick={toggleBulkEditMode}>
          Bulk Edit
        </button>
      </div>
    </StyledWrapper>
  );
};
export default RequestHeaders;
