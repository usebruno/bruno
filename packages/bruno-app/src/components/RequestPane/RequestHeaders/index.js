import React, { useState } from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash } from '@tabler/icons';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  addRequestHeader,
  updateRequestHeader,
  deleteRequestHeader,
  moveRequestHeader,
  setRequestHeaders
} from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import SingleLineEditor from 'components/SingleLineEditor';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';
import { headers as StandardHTTPHeaders } from 'know-your-http-well';
import { MimeTypes } from 'utils/codemirror/autocompleteConstants';
import Table from 'components/Table/index';
import ReorderTable from 'components/ReorderTable/index';
const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const RequestHeaders = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');

  const [bulkEdit, setBulkEdit] = useState(false);
  const [bulkText, setBulkText] = useState('');

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
    switch (type) {
      case 'name': {
        header.name = e.target.value;
        break;
      }
      case 'value': {
        header.value = e.target.value;
        break;
      }
      case 'enabled': {
        header.enabled = e.target.checked;
        break;
      }
    }
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

  const handleBulkEdit = (value) => {
    setBulkText(value);

    const keyValPairs = value
      .split(/\r?\n/)
      .map((pair) => {
        const sep = pair.indexOf(':');
        if (sep < 0) {
          return [];
        }
        return [pair.slice(0, sep).trim(), pair.slice(sep + 1).trim()];
      })
      .filter((pair) => pair.length === 2);

    dispatch(
      setRequestHeaders({
        collectionUid: collection.uid,
        itemUid: item.uid,
        headers: keyValPairs.map(([name, value]) => ({
          name,
          value
        }))
      })
    );
  };

  const toggleBulkEdit = () => {
    if (!bulkEdit) {
      setBulkText(
        headers
          .filter((header) => header.enabled)
          .map((header) => `${header.name}: ${header.value}`)
          .join('\n')
      );
    }
    setBulkEdit(!bulkEdit);
  };

  return (
    <StyledWrapper className="w-full h-full flex flex-col flex-grow">
      <div className="top-controls mb-3">
        <button className="text-link select-none" onClick={toggleBulkEdit}>
          {bulkEdit ? 'Key/Value Edit' : 'Bulk Edit'}
        </button>
      </div>
      {bulkEdit && (
        <div className="bulk-editor flex-grow">
          <CodeEditor
            mode="application/text"
            theme={storedTheme}
            font={get(preferences, 'font.codeFont', 'default')}
            value={bulkText}
            onEdit={handleBulkEdit}
          />
        </div>
      )}
      {!bulkEdit && (
        <table>
          <thead>
            <tr>
              <td>Name</td>
              <td>Value</td>
              <td></td>
            </tr>
          </thead>
          <tbody>
            {headers && headers.length
              ? headers.map((header) => {
                  return (
                    <tr key={header.uid}>
                      <td>
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
                          collection={collection}
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
          </tbody>
        </table>
      )}
      <div className="bottom-controls py-3 mt-2">
        {!bulkEdit && (
          <button className="text-link pr-3 select-none" onClick={addHeader}>
            + Add Header
          </button>
        )}
      </div>
    </StyledWrapper>
  );
};
export default RequestHeaders;
