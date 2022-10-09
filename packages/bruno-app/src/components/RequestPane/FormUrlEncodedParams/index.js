import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { addFormUrlEncodedParam, updateFormUrlEncodedParam, deleteFormUrlEncodedParam } from 'providers/ReduxStore/slices/collections';
import StyledWrapper from './StyledWrapper';

const FormUrlEncodedParams = ({item, collection}) => {
  const dispatch = useDispatch();
  const params = item.draft ? get(item, 'draft.request.body.formUrlEncoded') : get(item, 'request.body.formUrlEncoded');

  const addParam = () => {
    dispatch(addFormUrlEncodedParam({
      itemUid: item.uid,
      collectionUid: collection.uid,
    }));
  };

  const handleParamChange = (e, _param, type) => {
    const param = cloneDeep(_param);
    switch(type) {
      case 'name' : {
        param.name = e.target.value;
        break;
      }
      case 'value' : {
        param.value = e.target.value;
        break;
      }
      case 'description' : {
        param.description = e.target.value;
        break;
      }
      case 'enabled' : {
        param.enabled = e.target.checked;
        break;
      }
    }
    dispatch(updateFormUrlEncodedParam({
      param: param,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };
  
  const handleRemoveParams = (param) => {
    dispatch(deleteFormUrlEncodedParam({
      paramUid: param.uid,
      itemUid: item.uid,
      collectionUid: collection.uid
    }));
  };
  
  return (
    <StyledWrapper className="w-full">
      <table>
        <thead>
          <tr>
            <td>Key</td>
            <td>Value</td>
            <td>Description</td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {params && params.length ? params.map((param, index) => {
            return (
              <tr key={param.uid}>
                <td>
                  <input
                    type="text"
                    autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                    value={param.name}
                    className="mousetrap"
                    onChange={(e) => handleParamChange(e, param, 'name')}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                    value={param.value}
                    className="mousetrap"
                    onChange={(e) => handleParamChange(e, param, 'value')}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    autoComplete="off" autoCorrect="off" autoCapitalize="off" spellCheck="false"
                    value={param.description}
                    className="mousetrap"
                    onChange={(e) => handleParamChange(e, param, 'description')}
                  />
                </td>
                <td>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={param.enabled}
                      className="mr-3 mousetrap"
                      onChange={(e) => handleParamChange(e, param, 'enabled')}
                    />
                    <button onClick={() => handleRemoveParams(param)}>
                      <IconTrash strokeWidth={1.5} size={20}/>
                    </button>
                  </div>
                </td>
              </tr>
            );
          }) : null}
        </tbody>
      </table>
      <button className="btn-add-param text-link pr-2 py-3 mt-2 select-none" onClick={addParam}>+ Add Param</button>
    </StyledWrapper>
  )
};
export default FormUrlEncodedParams;