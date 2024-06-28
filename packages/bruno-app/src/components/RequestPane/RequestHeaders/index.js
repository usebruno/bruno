import React from 'react';
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
import MediaTypes from 'know-your-http-well/json/media-types.json';
const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);
const mediaTypesAutoCompleteList = MediaTypes.map((e) => e.media_type);

function headerValueAutoCompleteList(header) {
  if (header.name && (header.name.toLowerCase() === 'content-type' || header.name.toLowerCase() === 'accept')) {
    return mediaTypesAutoCompleteList;
  }

  return [];
}

const RequestHeaders = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');

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
                        autocomplete={headerValueAutoCompleteList(header)}
                        onRun={handleRun}
                        allowNewlines={true}
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
      <button className="btn-add-header text-link pr-2 py-3 mt-2 select-none" onClick={addHeader}>
        + Add Header
      </button>
    </StyledWrapper>
  );
};
export default RequestHeaders;
