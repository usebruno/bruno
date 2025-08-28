import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  addMultipartFormParam,
  updateMultipartFormParam,
  deleteMultipartFormParam,
  moveMultipartFormParam,
  updateRequestBody
} from 'providers/ReduxStore/slices/collections';
import MultiLineEditor from 'components/MultiLineEditor';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import FilePickerEditor from 'components/FilePickerEditor';
import Table from 'components/Table/index';
import ReorderTable from 'components/ReorderTable/index';

const MultipartFormParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const params = item.draft ? get(item, 'draft.request.body.multipartForm') : get(item, 'request.body.multipartForm');

  const addParam = () => {
    dispatch(
      addMultipartFormParam({
        itemUid: item.uid,
        collectionUid: collection.uid,
        type: 'text',
        value: ''
      })
    );
  };

  const addFile = () => {
    dispatch(
      addMultipartFormParam({
        itemUid: item.uid,
        collectionUid: collection.uid,
        type: 'file',
        value: []
      })
    );
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  const handleParamChange = (e, _param, type) => {
    const param = cloneDeep(_param);
    switch (type) {
      case 'name': {
        param.name = e.target.value;
        break;
      }
      case 'value': {
        param.value = e.target.value;
        break;
      }
      case 'contentType': {
        param.contentType = e.target.value;
        break;
      }
      case 'enabled': {
        param.enabled = e.target.checked;
        break;
      }
    }
    dispatch(
      updateMultipartFormParam({
        param: param,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const handleRemoveParams = (param) => {
    dispatch(
      deleteMultipartFormParam({
        paramUid: param.uid,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const handleParamDrag = ({ updateReorderedItem }) => {
    dispatch(
      moveMultipartFormParam({
        collectionUid: collection.uid,
        itemUid: item.uid,
        updateReorderedItem
      })
    );
  };

  const handleToggleAllParams = () => {
    const hasEnabledParams = params && params.some((param) => param.enabled);
    const updatedParams = params ? params.map((param) => ({
      ...param,
      enabled: !hasEnabledParams
    })) : [];
    
    dispatch(updateRequestBody({ 
      collectionUid: collection.uid, 
      itemUid: item.uid, 
      content: updatedParams,
      mode: 'multipartForm'
    }));
  };

  return (
    <StyledWrapper className="w-full">
      <Table
        headers={[
          { name: 'Key', accessor: 'key', width: '29%' },
          { name: 'Value', accessor: 'value', width: '29%' },
          { name: 'Content-Type', accessor: 'content-type', width: '28%' },
          { 
            name: '', 
            accessor: '', 
            width: '14%',
            renderHeader: () => {
              const hasEnabledParams = params && params.some((param) => param.enabled);
              const allEnabled = params && params.length > 0 && params.every((param) => param.enabled);
              const someEnabled = hasEnabledParams && !allEnabled;
              
              return (
                <div className="flex items-center justify-center">
                  <input
                    type="checkbox"
                    checked={allEnabled}
                    ref={(input) => {
                      if (input) {
                        input.indeterminate = someEnabled;
                      }
                    }}
                    onChange={handleToggleAllParams}
                    disabled={!params || params.length === 0}
                    title={allEnabled ? "Deselect all" : "Select all"}
                  />
                </div>
              );
            }
          }
        ]}
      >
        <ReorderTable updateReorderedItem={handleParamDrag}>
          {params && params.length
            ? params.map((param) => {
              return (
                <tr key={param.uid} className='w-full' data-uid={param.uid}>
                  <td className="flex relative">
                    <input
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck="false"
                      value={param.name}
                      className="mousetrap"
                      onChange={(e) => handleParamChange(e, param, 'name')}
                    />
                  </td>
                  <td>
                    {param.type === 'file' ? (
                      <FilePickerEditor
                        value={param.value}
                        onChange={(newValue) =>
                          handleParamChange(
                            {
                              target: {
                                value: newValue
                              }
                            },
                            param,
                            'value'
                          )
                        }
                        collection={collection}
                      />
                    ) : (
                      <MultiLineEditor
                        onSave={onSave}
                        theme={storedTheme}
                        value={param.value}
                        onChange={(newValue) =>
                          handleParamChange(
                            {
                              target: {
                                value: newValue
                              }
                            },
                            param,
                            'value'
                          )
                        }
                        onRun={handleRun}
                        allowNewlines={true}
                        collection={collection}
                        item={item}
                      />
                    )}
                  </td>
                  <td>
                    <MultiLineEditor
                      onSave={onSave}
                      theme={storedTheme}
                      placeholder="Auto"
                      value={param.contentType}
                      onChange={(newValue) =>
                        handleParamChange(
                          {
                            target: {
                              value: newValue
                            }
                          },
                          param,
                          'contentType'
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
                        checked={param.enabled}
                        tabIndex="-1"
                        className="mr-3 mousetrap"
                        onChange={(e) => handleParamChange(e, param, 'enabled')}
                      />
                      <button tabIndex="-1" onClick={() => handleRemoveParams(param)}>
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
      <div>
        <button className="btn-add-param text-link pr-2 pt-3 mt-2 select-none" onClick={addParam}>
          + Add Param
        </button>
      </div>
      <div>
        <button className="btn-add-param text-link pr-2 pt-3 select-none" onClick={addFile}>
          + Add File
        </button>
      </div>
    </StyledWrapper>
  );
};
export default MultipartFormParams;
