import React, { useState } from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  addCollectionHeader,
  updateCollectionHeader,
  deleteCollectionHeader,
  setCollectionHeaders
} from 'providers/ReduxStore/slices/collections';
import { saveCollectionRoot } from 'providers/ReduxStore/slices/collections/actions';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';
import { headers as StandardHTTPHeaders } from 'know-your-http-well';
import { MimeTypes } from 'utils/codemirror/autocompleteConstants';
import BulkEditor from 'components/BulkEditor/index';
import { useParamAddAutoFocusIntent, addWithAutoFocus } from 'hooks/useParamAddAutoFocusIntent';

const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const Headers = ({ collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const headers = get(collection, 'root.request.headers', []);
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const { uidSetter, inputRef } = useParamAddAutoFocusIntent();

  const toggleBulkEditMode = () => {
    setIsBulkEditMode(!isBulkEditMode);
  };

  const handleBulkHeadersChange = (newHeaders) => {
    dispatch(setCollectionHeaders({ collectionUid: collection.uid, headers: newHeaders }));
  };

  const addHeader = () => {
    addWithAutoFocus(uidSetter, dispatch, addCollectionHeader, {
      collectionUid: collection.uid
    });
  };

  const handleSave = () => dispatch(saveCollectionRoot(collection.uid));
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
      updateCollectionHeader({
        header: header,
        collectionUid: collection.uid
      })
    );
  };

  const handleRemoveHeader = (header) => {
    dispatch(
      deleteCollectionHeader({
        headerUid: header.uid,
        collectionUid: collection.uid
      })
    );
  };

  if (isBulkEditMode) {
    return (
      <StyledWrapper className="h-full w-full">
        <div className="text-xs mb-4 text-muted">
          Add request headers that will be sent with every request in this collection.
        </div>
        <BulkEditor
          params={headers}
          onChange={handleBulkHeadersChange}
          onToggle={toggleBulkEditMode}
          onSave={handleSave}
        />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="h-full w-full">
      <div className="text-xs mb-4 text-muted">
        Add request headers that will be sent with every request in this collection.
      </div>
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
                        ref={inputRef(header.uid)}
                        value={header.name}
                        theme={storedTheme}
                        onSave={handleSave}
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
                        collection={collection}
                      />
                    </td>
                    <td>
                      <SingleLineEditor
                        value={header.value}
                        theme={storedTheme}
                        onSave={handleSave}
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
                        collection={collection}
                        autocomplete={MimeTypes}
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
      <div className="flex justify-between mt-2">
        <button className="btn-add-header text-link pr-2 py-3 select-none" onClick={addHeader}>
          + Add Header
        </button>
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
