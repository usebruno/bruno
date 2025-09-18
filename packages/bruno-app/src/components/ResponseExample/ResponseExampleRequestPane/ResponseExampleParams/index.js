import React, { useState } from 'react';
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
import StyledWrapper from './StyledWrapper';

const ResponseExampleParams = ({ editMode, item, collection, exampleUid }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);

  // Get params from item draft, similar to how RequestHeaders works
  const params = item.draft ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.request?.params || [] : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.request?.params || [];

  const queryParams = params.filter((param) => param.type === 'query');
  const pathParams = params.filter((param) => param.type === 'path');

  const handleAddQueryParam = () => {
    if (editMode) {
      dispatch(addResponseExampleParam({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid
      }));
    }
  };

  const handleQueryParamChange = (e, data, key) => {
    if (editMode) {
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
    }
  };

  const handleRemoveQueryParam = (param) => {
    if (editMode) {
      dispatch(deleteResponseExampleParam({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid,
        paramUid: param.uid
      }));
    }
  };

  const handleQueryParamDrag = ({ updateReorderedItem }) => {
    if (editMode) {
      dispatch(moveResponseExampleParam({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid,
        updateReorderedItem
      }));
    }
  };

  const toggleBulkEditMode = () => {
    setIsBulkEditMode(!isBulkEditMode);
  };

  const handleBulkParamsChange = (newParams) => {
    if (editMode) {
      dispatch(setResponseExampleParams({
        itemUid: item.uid,
        collectionUid: collection.uid,
        exampleUid: exampleUid,
        params: newParams
      }));
    }
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

  if (queryParams.length === 0 && !editMode) {
    return null;
  }

  return (
    <StyledWrapper className="w-full mt-4">
      <div className="flex-1 mt-2">
        <div className="mb-1 title text-xs">Query parameters</div>
        <Table
          headers={[
            { name: 'Name', accessor: 'name', width: '40%' },
            { name: 'Value', accessor: 'value', width: '60%' }
          ]}
        >
          <ReorderTable updateReorderedItem={handleQueryParamDrag}>
            {queryParams && queryParams.length
              ? queryParams.map((param) => (
                  <tr key={param.uid} data-uid={param.uid}>
                    <td className="flex relative">
                      <div className="flex items-center justify-center mr-3">
                        <Checkbox
                          checked={param.enabled !== false}
                          disabled={!editMode}
                          onChange={editMode ? (e) => handleQueryParamChange(e, param, 'enabled') : () => {}}
                        />
                      </div>
                      <SingleLineEditor
                        value={param.name || ''}
                        theme={storedTheme}
                        onSave={() => {}}
                        onChange={editMode ? (newValue) => handleQueryParamChange({ target: { value: newValue } }, param, 'name') : () => {}}
                        onRun={() => {}}
                        collection={collection}
                        variablesAutocomplete={true}
                      />
                    </td>
                    <td>
                      <div className="flex items-center justify-center pl-4">
                        <SingleLineEditor
                          value={param.value || ''}
                          theme={storedTheme}
                          onSave={() => {}}
                          onChange={editMode ? (newValue) => handleQueryParamChange({ target: { value: newValue } }, param, 'value') : () => {}}
                          onRun={() => {}}
                          collection={collection}
                          variablesAutocomplete={true}
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
      </div>
    </StyledWrapper>
  );
};

export default ResponseExampleParams;
