import { IconTrash } from '@tabler/icons';
import SingleLineEditor from 'components/SingleLineEditor';
import cloneDeep from 'lodash/cloneDeep';
import get from 'lodash/get';
import { addQueryParam, deleteQueryParam, updateQueryParam } from 'providers/ReduxStore/slices/collections';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import React from 'react';
import { useDispatch } from 'react-redux';

import StyledWrapper from './StyledWrapper';

const QueryParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const params = item.draft ? get(item, 'draft.request.params') : get(item, 'request.params');

  const handleAddParam = () => {
    dispatch(
      addQueryParam({
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
      updateQueryParam({
        param,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const handleRemoveParam = (param) => {
    dispatch(
      deleteQueryParam({
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
            <td>Name</td>
            <td>Value</td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {params && params.length
            ? params.map((param, index) => {
                const enabledClass = param.enabled ? ' bg-inherit' : 'bg-gray-100 opacity-50';
                return (
                  <tr key={param.uid}>
                    <td className={enabledClass}>
                      <input
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        value={param.name}
                        className={`mousetrap`}
                        onChange={(e) => handleParamChange(e, param, 'name')}
                      />
                    </td>
                    <td className={enabledClass}>
                      <SingleLineEditor
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
                        onRun={handleRun}
                        collection={collection}
                      />
                    </td>
                    <td className={enabledClass}>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={param.enabled}
                          tabIndex="-1"
                          className="mr-3 mousetrap"
                          onChange={(e) => handleParamChange(e, param, 'enabled')}
                        />
                        <button tabIndex="-1" onClick={() => handleRemoveParam(param)}>
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
      <button className="btn-add-param text-link pr-2 py-3 mt-2 select-none" onClick={handleAddParam}>
        +&nbsp;<span>Add Param</span>
      </button>
    </StyledWrapper>
  );
};
export default QueryParams;
