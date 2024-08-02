import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import has from 'lodash/has';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  addQueryParam,
  deleteQueryParam,
  updatePathParam,
  updateQueryParam
} from 'providers/ReduxStore/slices/collections';
import SingleLineEditor from 'components/SingleLineEditor';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';

import StyledWrapper from './StyledWrapper';

const QueryParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const params = item.draft ? get(item, 'draft.request.params') : get(item, 'request.params');
  const queryParams = params.filter((param) => param.type === 'query');
  const pathParams = params.filter((param) => param.type === 'path');

  const handleAddQueryParam = () => {
    dispatch(
      addQueryParam({
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleQueryParamChange = (e, data, key) => {
    let value;

    switch (key) {
      case 'name': {
        value = e.target.value;
        break;
      }
      case 'value': {
        value = e.target.value;
        break;
      }
      case 'enabled': {
        value = e.target.checked;
        break;
      }
    }

    let queryParam = cloneDeep(data);

    if (queryParam[key] === value) {
      return;
    }

    queryParam[key] = value;

    dispatch(
      updateQueryParam({
        queryParam,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const handlePathParamChange = (e, data) => {
    let value = e.target.value;

    let pathParam = cloneDeep(data);

    if (pathParam['value'] === value) {
      return;
    }

    pathParam['value'] = value;

    dispatch(
      updatePathParam({
        pathParam,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const handleRemoveQueryParam = (param) => {
    dispatch(
      deleteQueryParam({
        paramUid: param.uid,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  return (
    <StyledWrapper className="w-full flex flex-col">
      <div className="flex-1 mt-2">
        <div className="mb-1 title text-xs">Query</div>
        <table>
          <thead>
            <tr>
              <td>Name</td>
              <td>Value</td>
              <td></td>
            </tr>
          </thead>
          <tbody>
            {queryParams && queryParams.length
              ? queryParams.map((param, index) => {
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
                          onChange={(e) => handleQueryParamChange(e, param, 'name')}
                        />
                      </td>
                      <td>
                        <SingleLineEditor
                          value={param.value}
                          theme={storedTheme}
                          onSave={onSave}
                          onChange={(newValue) =>
                            handleQueryParamChange(
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
                            tabIndex="-1"
                            className="mr-3 mousetrap"
                            onChange={(e) => handleQueryParamChange(e, param, 'enabled')}
                          />
                          <button tabIndex="-1" onClick={() => handleRemoveQueryParam(param)}>
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
        <button className="btn-add-param text-link pr-2 py-3 mt-2 select-none" onClick={handleAddQueryParam}>
          +&nbsp;<span>Add Param</span>
        </button>
        <div className="mb-1 title text-xs">Path</div>
        <table>
          <thead>
            <tr>
              <td>Name</td>
              <td>Value</td>
            </tr>
          </thead>
          <tbody>
            {pathParams && pathParams.length
              ? pathParams.map((path, index) => {
                  return (
                    <tr key={path.uid}>
                      <td>
                        <input
                          type="text"
                          autoComplete="off"
                          autoCorrect="off"
                          autoCapitalize="off"
                          spellCheck="false"
                          value={path.name}
                          className="mousetrap"
                          readOnly={true}
                        />
                      </td>
                      <td>
                        <SingleLineEditor
                          value={path.value}
                          theme={storedTheme}
                          onSave={onSave}
                          onChange={(newValue) =>
                            handlePathParamChange(
                              {
                                target: {
                                  value: newValue
                                }
                              },
                              path
                            )
                          }
                          onRun={handleRun}
                          collection={collection}
                        />
                      </td>
                    </tr>
                  );
                })
              : null}
          </tbody>
        </table>
      </div>
    </StyledWrapper>
  );
};
export default QueryParams;
