import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  addMultipartFormParam,
  updateMultipartFormParam,
  deleteMultipartFormParam
} from 'providers/ReduxStore/slices/collections';
import SingleLineEditor from 'components/SingleLineEditor';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import { Trash2 } from 'lucide-react';

const MultipartFormParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const params = item.draft ? get(item, 'draft.request.body.multipartForm') : get(item, 'request.body.multipartForm');

  const addParam = () => {
    dispatch(
      addMultipartFormParam({
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
                      <SingleLineEditor
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
                          onClick={() => handleRemoveParams(param)}
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
      <button className="btn-add-param text-link pr-2 py-3 mt-2 select-none" onClick={addParam}>
        + Add Param
      </button>
    </StyledWrapper>
  );
};
export default MultipartFormParams;
