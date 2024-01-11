import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { addQueryParam, updateQueryParam, deleteQueryParam } from 'providers/ReduxStore/slices/collections';
import SingleLineEditor from 'components/SingleLineEditor';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';

import StyledWrapper from './StyledWrapper';
import { Trash2 } from 'lucide-react';

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
                    <td>
                      <div className="flex items-center">
                        <input
                          type="checkbox"
                          checked={param.enabled}
                          className="mr-3 mousetrap"
                          onChange={(e) => handleParamChange(e, param, 'enabled')}
                        />
                        <button
                          className="p-1 rounded hover:bg-red-100 dark:hover:bg-red-400/10 hover:text-red-600"
                          onClick={() => handleRemoveParam(param)}
                        >
                          <Trash2 size={16} />
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
