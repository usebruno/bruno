import React, { useEffect, useRef, useState } from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { addRequestHeader, updateRequestHeader, deleteRequestHeader } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';
import { headers as StandardHTTPHeaders } from 'know-your-http-well';
const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const RequestHeaders = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme, theme } = useTheme();
  const headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');

  const [countItems, setCountItems] = useState(headers.length);
  const ref = useRef();

  useEffect(() => {
    setCountItems(headers.length);
    if (headers.length > countItems) {
      ref.current.scrollIntoView();
    }
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

  return (
    <StyledWrapper className="w-full">
      <div class="scroll" style={{ maxHeight: '55vh', overflowY: 'auto' }}>
        <table>
          <thead style={{ backgroundColor: theme.table.thead.bg, position: 'sticky', top: -1, zIndex: 2 }}>
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
          <div ref={ref} />
        </table>
      </div>
      <button className="btn-add-header text-link pr-2 py-3 mt-2 select-none" onClick={addHeader}>
        + Add Header
      </button>
    </StyledWrapper>
  );
};
export default RequestHeaders;
