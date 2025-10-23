import React, { useMemo } from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { updateResponseExampleMultipartFormParams } from 'providers/ReduxStore/slices/collections';
import mime from 'mime-types';
import path from 'utils/common/path';
import MultiLineEditor from 'components/MultiLineEditor';
import StyledWrapper from './StyledWrapper';
import FilePickerEditor from 'components/FilePickerEditor';
import Table from 'components/Table-v2';
import ReorderTable from 'components/ReorderTable/index';
import Checkbox from 'components/Checkbox';

const ResponseExampleMultipartFormParams = ({ item, collection, exampleUid, editMode = false }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const params = useMemo(() => {
    return item.draft
      ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.request?.body?.multipartForm || []
      : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.request?.body?.multipartForm || [];
  }, [item, exampleUid]);

  const addParam = () => {
    const newParam = {
      name: '',
      value: '',
      contentType: '',
      enabled: true,
      type: 'text'
    };

    const updatedParams = [...params, newParam];

    dispatch(updateResponseExampleMultipartFormParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: updatedParams
    }));
  };

  const addFile = () => {
    const newParam = {
      name: '',
      value: [],
      contentType: '',
      enabled: true,
      type: 'file'
    };

    const updatedParams = [...params, newParam];

    dispatch(updateResponseExampleMultipartFormParams({
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
        if (param.type === 'file' && e.target.value) {
          const contentType = mime.contentType(path.extname(e.target.value));
          param.contentType = contentType || '';
        }
        break;
      }
      case 'contentType': {
        param.contentType = e.target.value;
        break;
      }
      case 'enabled': {
        param.enabled = e.target.checked;
        break;
      }
    }

    const updatedParams = params.map((p) => p.uid === param.uid ? param : p);

    dispatch(updateResponseExampleMultipartFormParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: updatedParams
    }));
  };

  const handleRemoveParams = (param) => {
    if (!editMode) return;

    const updatedParams = params.filter((p) => p.uid !== param.uid);

    dispatch(updateResponseExampleMultipartFormParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: updatedParams
    }));
  };

  const handleParamDrag = ({ updateReorderedItem }) => {
    if (!editMode) return;

    const reorderedParams = updateReorderedItem.map((uid) => {
      return params.find((p) => p.uid === uid);
    });

    dispatch(updateResponseExampleMultipartFormParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: reorderedParams
    }));
  };

  if (params.length === 0 && !editMode) {
    return null;
  }

  return (
    <StyledWrapper className="w-full mt-4">
      <Table
        headers={[
          { name: 'Key', accessor: 'key', width: '30%' },
          { name: 'Value', accessor: 'value', width: '40%' },
          { name: 'Content-Type', accessor: 'content-type', width: '30%' }
        ]}
      >
        <ReorderTable updateReorderedItem={handleParamDrag}>
          {params && params.length
            ? params.map((param, index) => {
                return (
                  <tr key={param.uid} className="w-full" data-uid={param.uid}>
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
                        onChange={(e) => handleParamChange(e, param, 'name')}
                        disabled={!editMode}
                      />
                    </td>
                    <td>
                      <div className="flex items-center justify-center pl-4">
                        {param.type === 'file' ? (
                          <FilePickerEditor
                            value={param.value}
                            onChange={(newValue) =>
                              handleParamChange({
                                target: {
                                  value: newValue
                                }
                              },
                              param,
                              'value')}
                            collection={collection}
                            readOnly={!editMode}
                          />
                        ) : (
                          <MultiLineEditor
                            onSave={() => {}}
                            theme={storedTheme}
                            value={param.value}
                            onChange={(newValue) =>
                              handleParamChange({
                                target: {
                                  value: newValue
                                }
                              },
                              param,
                              'value')}
                            onRun={() => {}}
                            allowNewlines={true}
                            collection={collection}
                            item={item}
                            readOnly={!editMode}
                          />
                        )}
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-center pl-4">
                        <MultiLineEditor
                          onSave={() => {}}
                          theme={storedTheme}
                          placeholder="Auto"
                          value={param.contentType}
                          onChange={(newValue) =>
                            handleParamChange({
                              target: {
                                value: newValue
                              }
                            },
                            param,
                            'contentType')}
                          onRun={() => {}}
                          collection={collection}
                          readOnly={!editMode}
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
          <button
            className="btn-action text-link pr-2 py-3 select-none"
            onClick={addFile}
          >
            + Add File
          </button>
        </div>
      )}
    </StyledWrapper>
  );
};

export default ResponseExampleMultipartFormParams;
