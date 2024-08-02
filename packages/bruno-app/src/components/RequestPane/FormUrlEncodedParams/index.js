import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  addFormUrlEncodedParam,
  updateFormUrlEncodedParam,
  deleteFormUrlEncodedParam
} from 'providers/ReduxStore/slices/collections';
import MultiLineEditor from 'components/MultiLineEditor';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';

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

  return (
    <StyledWrapper className="w-full">
      <table>
        <thead>
          <tr>
            <td>Key</td>
            <td>Value</td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {params && params.length
            ? params.map((param, index) => {
                return (
                  <tr key={param.uid}>
                    <td>
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
        </tbody>
      </table>
      <button className="btn-add-param text-link pr-2 py-3 mt-2 select-none" onClick={addParam}>
        + Add Param
      </button>
    </StyledWrapper>
  );
};
export default FormUrlEncodedParams;
