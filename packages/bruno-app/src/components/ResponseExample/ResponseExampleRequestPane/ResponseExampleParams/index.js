import React, { useState, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { IconTrash } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import get from 'lodash/get';
import { addResponseExampleParam, updateResponseExampleParam, deleteResponseExampleParam, moveResponseExampleParam, setResponseExampleParams } from 'providers/ReduxStore/slices/collections';
import Table from 'components/Table-v2';
import ReorderTable from 'components/ReorderTable';
import SingleLineEditor from 'components/SingleLineEditor';
import BulkEditor from 'components/BulkEditor';
import Checkbox from 'components/Checkbox';
import InfoTip from 'components/InfoTip';
import StyledWrapper from './StyledWrapper';

const ResponseExampleParams = ({ editMode, item, collection, exampleUid }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);

  const params = useMemo(() => {
    return item.draft
      ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.request?.params || []
      : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.request?.params || [];
  }, [item, exampleUid]);

  const queryParams = params.filter((param) => param.type === 'query');
  const pathParams = params.filter((param) => param.type === 'path');

  const handleAddQueryParam = () => {
    if (!editMode) {
      return;
    }

    dispatch(addResponseExampleParam({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid
    }));
  };

  const handleQueryParamChange = (e, data, key) => {
    if (!editMode) {
      return;
    }

    const updatedParam = { ...data };
    switch (key) {
      case 'name': {
        updatedParam.name = e.target.value;
        break;
      }
      case 'value': {
        updatedParam.value = e.target.value;
        break;
      }
      case 'enabled': {
        updatedParam.enabled = e.target.checked;
        break;
      }
    }

    dispatch(updateResponseExampleParam({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      param: updatedParam
    }));
  };

  const handleRemoveQueryParam = (param) => {
    if (!editMode) {
      return;
    }

    dispatch(deleteResponseExampleParam({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      paramUid: param.uid
    }));
  };

  const handleQueryParamDrag = ({ updateReorderedItem }) => {
    if (!editMode) {
      return;
    }

    dispatch(moveResponseExampleParam({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      updateReorderedItem
    }));
  };

  const toggleBulkEditMode = () => {
    setIsBulkEditMode(!isBulkEditMode);
  };

  const handleBulkParamsChange = (newParams) => {
    if (!editMode) {
      return;
    }

    dispatch(setResponseExampleParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: newParams
    }));
  };

  const handlePathParamChange = (e, data) => {
    if (!editMode) {
      return;
    }

    const updatedParam = { ...data };
    updatedParam.value = e.target.value;

    dispatch(updateResponseExampleParam({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      param: updatedParam
    }));
  };

  if (isBulkEditMode && editMode) {
    return (
      <StyledWrapper className="w-full mt-3">
        <BulkEditor
          params={queryParams}
          onChange={handleBulkParamsChange}
          onToggle={toggleBulkEditMode}
        />
      </StyledWrapper>
    );
  }

  if (queryParams.length === 0 && pathParams.length === 0 && !editMode) {
    return null;
  }

  return (
    <StyledWrapper className="w-full mt-4">
      <div className="mb-1 title text-xs font-bold">Query parameters</div>
      <Table
        headers={[
          { name: 'Name', accessor: 'name', width: '40%' },
          { name: 'Value', accessor: 'value', width: '60%' }
        ]}
      >
        <ReorderTable updateReorderedItem={handleQueryParamDrag}>
          {queryParams && queryParams.length
            ? queryParams.map((param, index) => (
                <tr key={param.uid} data-uid={param.uid}>
                  <td className="flex relative">
                    <div className="flex items-center justify-center mr-3">
                      <Checkbox
                        checked={param.enabled !== false}
                        disabled={!editMode}
                        onChange={(e) => handleQueryParamChange(e, param, 'enabled')}
                        dataTestId={`query-param-checkbox-${index}`}
                      />
                    </div>
                    <SingleLineEditor
                      value={param.name || ''}
                      theme={storedTheme}
                      onSave={() => {}}
                      onChange={(newValue) => handleQueryParamChange({ target: { value: newValue } }, param, 'name')}
                      onRun={() => {}}
                      collection={collection}
                      variablesAutocomplete={true}
                      readOnly={!editMode}
                    />
                  </td>
                  <td>
                    <div className="flex items-center justify-center pl-4">
                      <SingleLineEditor
                        value={param.value || ''}
                        theme={storedTheme}
                        onSave={() => {}}
                        onChange={(newValue) => handleQueryParamChange({ target: { value: newValue } }, param, 'value')}
                        onRun={() => {}}
                        collection={collection}
                        variablesAutocomplete={true}
                        readOnly={!editMode}
                      />
                      {editMode && (
                        <button tabIndex="-1" onClick={() => handleRemoveQueryParam(param)} className="delete-button">
                          <IconTrash strokeWidth={1.5} size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            : null}
        </ReorderTable>
      </Table>

      {editMode && (
        <div className="flex justify-between mt-2">
          <button
            className="btn-action text-link pr-2 py-3 select-none"
            onClick={handleAddQueryParam}
          >
            + Add Param
          </button>
          <button
            className="btn-action text-link select-none"
            onClick={toggleBulkEditMode}
          >
            Bulk Edit
          </button>
        </div>
      )}
      {pathParams && pathParams.length > 0 && (
        <>
          <div className="mb-1 title text-xs font-bold flex items-stretch mt-4">
            <span>Path parameters</span>
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
            {pathParams && pathParams.length
              ? pathParams.map((path, index) => {
                  return (
                    <tr key={index} data-uid={path.uid}>
                      <td>
                        {path.name}
                      </td>
                      <td>
                        <SingleLineEditor
                          value={path.value}
                          theme={storedTheme}
                          onSave={() => {}}
                          onChange={(newValue) => handlePathParamChange({ target: { value: newValue } }, path)}
                          onRun={() => {}}
                          collection={collection}
                          variablesAutocomplete={true}
                          readOnly={!editMode}
                        />
                      </td>
                    </tr>
                  );
                })
              : null}
          </Table>
          {pathParams.length === 0 && <div className="title pr-2 py-3 mt-2 text-xs">No path parameters defined</div>}
        </>
      )}

    </StyledWrapper>
  );
};

export default ResponseExampleParams;
