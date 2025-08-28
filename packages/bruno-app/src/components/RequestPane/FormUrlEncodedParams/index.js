import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  addFormUrlEncodedParam,
  updateFormUrlEncodedParam,
  deleteFormUrlEncodedParam,
  moveFormUrlEncodedParam,
  updateRequestBody
} from 'providers/ReduxStore/slices/collections';
import MultiLineEditor from 'components/MultiLineEditor';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import ReorderTable from 'components/ReorderTable/index';
import Table from 'components/Table/index';

const FormUrlEncodedParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const params = item.draft ? get(item, 'draft.request.body.formUrlEncoded') : get(item, 'request.body.formUrlEncoded');

  const addParam = () => {
    dispatch(
      addFormUrlEncodedParam({
        itemUid: item.uid,
        collectionUid: collection.uid
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
      case 'enabled': {
        param.enabled = e.target.checked;
        break;
      }
    }
    dispatch(
      updateFormUrlEncodedParam({
        param: param,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const handleRemoveParams = (param) => {
    dispatch(
      deleteFormUrlEncodedParam({
        paramUid: param.uid,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const handleParamDrag = ({ updateReorderedItem }) => {
    dispatch(
      moveFormUrlEncodedParam({
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
      mode: 'formUrlEncoded'
    }));
  };

  return (
    <StyledWrapper className="w-full">
      <Table
        headers={[
          { name: 'Key', accessor: 'key', width: '40%' },
          { name: 'Value', accessor: 'value', width: '46%' },
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
                <tr key={param.uid} data-uid={param.uid}>
                  <td className='flex relative'>
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
                    <MultiLineEditor
                      value={param.value}
                      theme={storedTheme}
                      onSave={onSave}
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
                      allowNewlines={true}
                      onRun={handleRun}
                      collection={collection}
                      item={item}
                    />
                  </td>
                  <td>
                    <div className="flex items-center justify-center">
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
      <button className="btn-add-param text-link pr-2 py-3 mt-2 select-none" onClick={addParam}>
        + Add Param
      </button>
    </StyledWrapper>
  );
};
export default FormUrlEncodedParams;
