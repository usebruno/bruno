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
import { MimeTypes } from 'utils/codemirror/autocompleteConstants';

const RequestHeaders = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');
  const [bulkEdit, setBulkEdit] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const [bulkEdit, setBulkEdit] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const addHeader = () => {
    if (!bulkEdit) {
      dispatch(
        addRequestHeader({
          itemUid: item.uid,
          collectionUid: collection.uid
        })
      );
    }
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

  const handleHeaderDrag = ({ updateReorderedItem }) => {
    dispatch(
      moveRequestHeader({
        collectionUid: collection.uid,
        itemUid: item.uid,
        updateReorderedItem
      })
    );
  };

  const handleBulkEdit = (value) => {
    setBulkText(value);

    const keyValPairs = value
      .split(/\r?\n/)
      .map((pair) => {
        const isEnabled = !pair.trim().startsWith('//');
        const cleanPair = pair.replace(/^\/\/\s*/, '');
        const sep = cleanPair.indexOf(':');
        if (sep < 0) {
          return [];
        }
        return [cleanPair.slice(0, sep).trim(), cleanPair.slice(sep + 1).trim(), isEnabled];
      })
      .filter((pair) => pair.length === 3);

    dispatch(
      setRequestHeaders({
        collectionUid: collection.uid,
        itemUid: item.uid,
        headers: keyValPairs.map(([name, value, enabled]) => ({
          name,
          value,
          enabled: enabled
        }))
      })
    );
  };

  const toggleBulkEdit = () => {
    if (!bulkEdit) {
      setBulkText(
        headers
          .map((header) => `${header.enabled ? '' : '//'}${header.name}:${header.value}`)
          .join('\n')
      );
    }
    setBulkEdit(!bulkEdit);
  };

  return (
    <StyledWrapper className="w-full h-full">
      {bulkEdit ? (
        <div>
          <div className="h-[200px]">
            <CodeEditor
              mode="application/text"
              theme={displayedTheme}
              font={get(preferences, 'font.codeFont', 'default')}
              value={bulkText}
              onSave={onSave}
              onEdit={handleBulkEdit}
            />
          </div>
          <div className="flex justify-between items-center mt-3">
            <div></div>
            <button className="text-link select-none" onClick={toggleBulkEdit}>
              {bulkEdit ? 'Key/Value Edit' : 'Bulk Edit'}
            </button>
          </div>
        </div>
      ) : (
        <div>
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
                        <td className="flex relative">
                          <SingleLineEditor
                            value={header.name}
                            theme={displayedTheme}
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
                            theme={displayedTheme}
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
                            allowNewlines={true}
                            collection={collection}
                            item={item}
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

          <div className="flex justify-between items-center mt-3">
            <button className="text-link pr-3 select-none" onClick={addHeader}>
              + Add Header
            </button>
            <button className="text-link select-none" onClick={toggleBulkEdit}>
              {bulkEdit ? 'Key/Value Edit' : 'Bulk Edit'}
            </button>
          </div>
        </div>
      )}
    </StyledWrapper>
  );
};

export default RequestHeaders;
