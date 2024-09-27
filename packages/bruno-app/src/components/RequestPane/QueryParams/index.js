import React, { useState } from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import InfoTip from 'components/InfoTip';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  addQueryParam,
  updateQueryParam,
  deleteQueryParam,
  moveQueryParam,
  updatePathParam,
  setQueryParams
} from 'providers/ReduxStore/slices/collections';
import SingleLineEditor from 'components/SingleLineEditor';
import CodeEditor from 'components/CodeEditor';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import Table from 'components/Table/index';
import ReorderTable from 'components/ReorderTable';

const QueryParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const params = item.draft ? get(item, 'draft.request.params') : get(item, 'request.params');
  const queryParams = params.filter((param) => param.type === 'query');
  const pathParams = params.filter((param) => param.type === 'path');

  const [queryBulkEdit, setQueryBulkEdit] = useState(false);
  const [queryBulkText, setQueryBulkText] = useState('');

  const handleQueryBulkEdit = (value) => {
    setQueryBulkText(value);

    const keyValPairs = value
      .split(/\r?\n/)
      .map((pair) => {
        const isEnabled = !pair.trim().startsWith('//');
        const cleanPair = pair.replace(/^\/\/\s*/, '');
        const sep = cleanPair.indexOf(':');
        if (sep < 0) {
          return [];
        }
        return [cleanPair.slice(0, sep).trim(), cleanPair.slice(sep + 1).trim(), isEnabled];
      })
      .filter((pair) => pair.length === 3);

    dispatch(
      setQueryParams({
        collectionUid: collection.uid,
        itemUid: item.uid,
        params: keyValPairs.map(([name, value, enabled]) => ({
          name,
          value,
          enabled: enabled,
          type: 'query'
        }))
      })
    );
  };

  const toggleQueryBulkEdit = () => {
    if (!queryBulkEdit) {
      setQueryBulkText(
        queryParams
          .map((param) => `${param.enabled ? '' : '//'}${param.name}:${param.value}`)
          .join('\n')
      );
    }
    setQueryBulkEdit(!queryBulkEdit);
  };

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

  const handleQueryParamDrag = ({ updateReorderedItem }) => {
    dispatch(
      moveQueryParam({
        collectionUid: collection.uid,
        itemUid: item.uid,
        updateReorderedItem
      })
    );
  };

  return (
    <StyledWrapper className="w-full h-full flex flex-col absolute">
      <div className="flex-1">
        <div>
          <div className="mt-3 mb-1 title text-xs">Query</div>

          {!queryBulkEdit ? (
            <Table
              headers={[
                { name: 'Name', accessor: 'name', width: '31%' },
                { name: 'Value', accessor: 'value', width: '56%' },
                { name: '', accessor: '', width: '13%' }
              ]}
            >
              <ReorderTable updateReorderedItem={handleQueryParamDrag}>
                {queryParams && queryParams.length
                  ? queryParams.map((param, index) => (
                      <tr key={param.uid} data-uid={param.uid}>
                        <td className="flex relative">
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
                            theme={displayedTheme}
                            onSave={onSave}
                            onChange={(newValue) =>
                              handleQueryParamChange({ target: { value: newValue } }, param, 'value')
                            }
                            onRun={handleRun}
                            collection={collection}
                            variablesAutocomplete={true}
                          />
                        </td>
                        <td>
                          <div className="flex items-center justify-center">
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
                    ))
                  : null}
              </ReorderTable>
            </Table>
          ) : (
            <div className="h-[200px]">
              <CodeEditor
                mode="application/text"
                theme={displayedTheme}
                value={queryBulkText}
                onEdit={handleQueryBulkEdit}
                onSave={() => {
                  handleQueryBulkEdit(queryBulkText);
                  onSave();
                }}
              />
            </div>
          )}

          <div className="flex justify-between items-center mt-2 mb-2">
            <div>
              {!queryBulkEdit && (
                <button className="text-link pr-2 py-3 select-none" onClick={handleAddQueryParam}>
                  +&nbsp;<span>Add Param</span>
                </button>
              )}
            </div>
            <div>
              <button className="text-link select-none" onClick={toggleQueryBulkEdit}>
                {queryBulkEdit ? 'Key/Value Edit' : 'Bulk Edit'}
              </button>
            </div>
          </div>

          {pathParams && pathParams.length > 0 && (
            <div className="mt-6">
              <div className="mb-2 title text-xs flex items-stretch">
                <span>Path</span>
                <InfoTip infotipId="path-param-InfoTip">
                  <div>
                    Path variables are automatically added whenever the
                    <code className="font-mono mx-2">:name</code>
                    template is used in the URL. <br /> For example:
                    <code className="font-mono mx-2">
                      https://example.com/v1/users/<span>:id</span>
                    </code>
                  </div>
                </InfoTip>
              </div>

              <Table
                headers={[
                  { name: 'Name', accessor: 'name', width: '40%' },
                  { name: 'Value', accessor: 'value', width: '60%' }
                ]}
              >
                {pathParams.map((path) => (
                  <tr key={path.uid}>
                    <td className="flex relative">
                      <input
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        value={path.name}
                        className="mousetrap w-full"
                        readOnly={true}
                      />
                    </td>
                    <td>
                      <SingleLineEditor
                        value={path.value}
                        theme={displayedTheme}
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
                        item={item}
                      />
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          )}
        </div>
      </div>
    </StyledWrapper>
  );
};

export default QueryParams;
