import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { updateResponseExampleFormUrlEncodedParams } from 'providers/ReduxStore/slices/collections';
import MultiLineEditor from 'components/MultiLineEditor';
import StyledWrapper from './StyledWrapper';
import ReorderTable from 'components/ReorderTable/index';
import Table from 'components/Table-v2';
import Checkbox from 'components/Checkbox';

const ResponseExampleFormUrlEncodedParams = ({ item, collection, exampleUid, editMode = false }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  // Get form data from the specific example
  const params = item.draft
    ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.request?.body?.formUrlEncoded || []
    : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.request?.body?.formUrlEncoded || [];

  const addParam = () => {
    const newParam = {
      name: '',
      value: '',
      enabled: true
    };

    const updatedParams = [...params, newParam];

    dispatch(updateResponseExampleFormUrlEncodedParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: updatedParams
    }));
  };

  const handleParamChange = (e, _param, type) => {
    if (!editMode) return;

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

    const updatedParams = params.map((p) => p.uid === param.uid ? param : p);

    dispatch(updateResponseExampleFormUrlEncodedParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: updatedParams
    }));
  };

  const handleRemoveParams = (param) => {
    const updatedParams = params.filter((p) => p.uid !== param.uid);

    dispatch(updateResponseExampleFormUrlEncodedParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: updatedParams
    }));
  };

  const handleParamDrag = ({ updateReorderedItem }) => {
    const updatedParams = updateReorderedItem(params);

    dispatch(updateResponseExampleFormUrlEncodedParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: updatedParams
    }));
  };

  if (params.length === 0 && !editMode) {
    return null;
  }

  return (
    <StyledWrapper className="w-full mt-4">
      <Table
        headers={[
          { name: 'Key', accessor: 'key', width: '40%' },
          { name: 'Value', accessor: 'value', width: '60%' }
        ]}
      >
        <ReorderTable updateReorderedItem={handleParamDrag}>
          {params && params.length
            ? params.map((param, index) => {
                return (
                  <tr key={param.uid} data-uid={param.uid}>
                    <td className="flex relative">
                      <div className="flex items-center justify-center mr-3">
                        <Checkbox
                          checked={param.enabled === true}
                          disabled={!editMode}
                          onChange={(e) => handleParamChange(e, param, 'enabled')}
                        />
                      </div>
                      <input
                        type="text"
                        autoComplete="off"
                        autoCorrect="off"
                        autoCapitalize="off"
                        spellCheck="false"
                        value={param.name}
                        className="mousetrap"
                        onChange={editMode ? (e) => handleParamChange(e, param, 'name') : () => {}}
                        disabled={!editMode}
                      />
                    </td>
                    <td>
                      <div className="flex items-center justify-center pl-4">
                        <MultiLineEditor
                          value={param.value}
                          theme={storedTheme}
                          onSave={() => {}}
                          onChange={editMode ? (newValue) =>
                            handleParamChange({
                              target: {
                                value: newValue
                              }
                            },
                            param,
                            'value') : () => {}}
                          allowNewlines={true}
                          onRun={() => {}}
                          collection={collection}
                          item={item}
                        />
                        <button
                          tabIndex="-1"
                          onClick={() => handleRemoveParams(param)}
                          className={`delete-button ${editMode ? 'edit-mode' : ''}`}
                          disabled={!editMode}
                        >
                          <IconTrash strokeWidth={1.5} size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            : null}
        </ReorderTable>
      </Table>

      {editMode && (
        <div className="flex justify-between mt-2">
          <button
            className="btn-action text-link pr-2 py-3 select-none"
            onClick={addParam}
          >
            + Add Param
          </button>
        </div>
      )}
    </StyledWrapper>
  );
};

export default ResponseExampleFormUrlEncodedParams;
