import React, { useState } from 'react';
import get from 'lodash/get';
import InfoTip from 'components/InfoTip';
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
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import Table from 'components/Table/index';
import BulkEditableTable from 'components/BulkEditableTable';

const parseBulkQueryParams = (value) => {
  return value
    .split(/\r?\n/)
    .map((pair) => {
      const isEnabled = !pair.trim().startsWith('//');
      const cleanPair = pair.replace(/^\/\/\s*/, '');
      const sep = cleanPair.indexOf(':');
      if (sep < 0) return null;
      return {
        name: cleanPair.slice(0, sep).trim(),
        value: cleanPair.slice(sep + 1).trim(),
        enabled: isEnabled,
        type: 'query'
      };
    })
    .filter(Boolean);
};

const serializeBulkQueryParams = (params) =>
  params
    .map((param) => `${param.enabled ? '' : '//'}${param.name}:${param.value}`)
    .join('\n');

const QueryParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { displayedTheme } = useTheme();
  const params = item.draft ? get(item, 'draft.request.params') : get(item, 'request.params');
  const queryParams = params.filter((param) => param.type === 'query');
  const pathParams = params.filter((param) => param.type === 'path');

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleAddQueryParam = () => {
    dispatch(addQueryParam({ itemUid: item.uid, collectionUid: collection.uid }));
  };

  const handleEditQueryParam = (param, key, value) => {
    const updated = { ...param, [key]: value };
    dispatch(updateQueryParam({ queryParam: updated, itemUid: item.uid, collectionUid: collection.uid }));
  };

  const handleRemoveQueryParam = (param) => {
    dispatch(deleteQueryParam({ paramUid: param.uid, itemUid: item.uid, collectionUid: collection.uid }));
  };

  const handleEnableQueryParam = (param, enabled) => {
    const updated = { ...param, enabled };
    dispatch(updateQueryParam({ queryParam: updated, itemUid: item.uid, collectionUid: collection.uid }));
  };

  const handleReorderQueryParam = ({ updateReorderedItem }) => {
    dispatch(moveQueryParam({ collectionUid: collection.uid, itemUid: item.uid, updateReorderedItem }));
  };

  const handleBulkSetQueryParams = (params) => {
    dispatch(setQueryParams({ collectionUid: collection.uid, itemUid: item.uid, params }));
  };

  return (
    <StyledWrapper className="w-full h-full flex flex-col absolute">
      <div className="flex-1">
        <div>
          <div className="mt-3 mb-1 title text-xs">Query</div>
          <BulkEditableTable
            items={queryParams}
            columns={[
              { name: 'Name', accessor: 'name', width: '30%' },
              { name: 'Value', accessor: 'value', width: '60%' },
              { name: '', accessor: '', width: '10%' }
            ]}
            bulkLabel="Param"
            onAdd={handleAddQueryParam}
            onEdit={handleEditQueryParam}
            onRemove={handleRemoveQueryParam}
            onEnable={handleEnableQueryParam}
            onReorder={handleReorderQueryParam}
            onBulkSet={handleBulkSetQueryParams}
            parseBulk={parseBulkQueryParams}
            serializeBulk={serializeBulkQueryParams}
            renderNameEditor={(param) => (
              <input
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck="false"
                value={param.name}
                className="mousetrap"
                onChange={(e) => handleEditQueryParam(param, 'name', e.target.value)}
              />
            )}
            renderValueEditor={(param) => (
              <SingleLineEditor
                value={param.value}
                theme={displayedTheme}
                onSave={onSave}
                onChange={(newValue) => handleEditQueryParam(param, 'value', newValue)}
                onRun={handleRun}
                collection={collection}
                variablesAutocomplete={true}
              />
            )}
          />
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
                          dispatch(updatePathParam({ pathParam: { ...path, value: newValue }, itemUid: item.uid, collectionUid: collection.uid }))
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
