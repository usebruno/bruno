import React, { useState, useEffect } from 'react';
import { get, cloneDeep, isArray } from 'lodash';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { updateResponseExampleFileBodyParams } from 'providers/ReduxStore/slices/collections';
import mime from 'mime-types';
import path from 'utils/common/path';
import StyledWrapper from './StyledWrapper';
import FilePickerEditor from 'components/FilePickerEditor/index';
import SingleLineEditor from 'components/SingleLineEditor/index';
import Table from 'components/Table-v2';
import ReorderTable from 'components/ReorderTable';
import RadioButton from 'components/RadioButton';

const ResponseExampleFileBody = ({ item, collection, exampleUid, editMode = false }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  // Get file data from the specific example
  const rawParams = item.draft
    ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.request?.body?.file
    : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.request?.body?.file;

  // Ensure params is always an array
  const params = Array.isArray(rawParams) ? rawParams : [];

  const [enabledFileUid, setEnableFileUid] = useState(params.length > 0 ? params[0].uid : '');

  const addFile = () => {
    const newParam = {
      filePath: '',
      contentType: '',
      selected: params.length === 0 // First file is selected by default
    };

    const updatedParams = [...params, newParam];

    dispatch(updateResponseExampleFileBodyParams({
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
      case 'filePath': {
        param.filePath = e.target.filePath;
        // Auto-detect content type from file extension using mime library (same as updateFile)
        const contentType = mime.contentType(path.extname(e.target.filePath));
        param.contentType = contentType || '';
        break;
      }
      case 'contentType': {
        param.contentType = e.target.contentType;
        break;
      }
      case 'selected': {
        // When a file is selected, deselect all others and select this one
        const updatedParams = params.map((p) => ({
          ...p,
          selected: p.uid === param.uid ? e.target.checked : false
        }));

        dispatch(updateResponseExampleFileBodyParams({
          itemUid: item.uid,
          collectionUid: collection.uid,
          exampleUid: exampleUid,
          params: updatedParams
        }));

        // Update the enabled file UID state
        if (e.target.checked) {
          setEnableFileUid(param.uid);
        }
        return; // Early return since we already dispatched
      }
    }

    const updatedParams = params.map((p) => p.uid === param.uid ? param : p);

    dispatch(updateResponseExampleFileBodyParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: updatedParams
    }));
  };

  const handleRemoveParams = (param) => {
    if (!editMode) return;

    const updatedParams = params.filter((p) => p.uid !== param.uid);

    dispatch(updateResponseExampleFileBodyParams({
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

    dispatch(updateResponseExampleFileBodyParams({
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
          { name: 'File', accessor: 'file', width: '50%' },
          { name: 'Content-Type', accessor: 'contentType', width: '30%' },
          { name: 'Selected', accessor: 'selected', width: '20%' }
        ]}
      >
        <ReorderTable updateReorderedItem={handleParamDrag}>
          {params && params.length
            ? params.map((param, index) => {
                return (
                  <tr key={param.uid} data-uid={param.uid}>
                    <td className="flex relative">
                      <FilePickerEditor
                        isSingleFilePicker={true}
                        value={param.filePath}
                        onChange={editMode ? (path) =>
                          handleParamChange({
                            target: {
                              filePath: path
                            }
                          },
                          param,
                          'filePath') : () => {}}
                        collection={collection}
                        editMode={editMode}
                      />
                    </td>
                    <td>
                      <div className="flex items-center justify-center pl-4">
                        <SingleLineEditor
                          className="flex items-center justify-center"
                          onSave={() => {}}
                          theme={storedTheme}
                          placeholder="Auto"
                          value={param.contentType}
                          onChange={editMode ? (newValue) =>
                            handleParamChange({
                              target: {
                                contentType: newValue
                              }
                            },
                            param,
                            'contentType') : () => {}}
                          onRun={() => {}}
                          collection={collection}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-center pl-4">
                        <RadioButton
                          key={param.uid}
                          id={`file-${param.uid}`}
                          name="selectedFile"
                          value={param.uid}
                          checked={enabledFileUid === param.uid || param.selected}
                          onChange={editMode ? (e) => handleParamChange(e, param, 'selected') : () => {}}
                          disabled={!editMode}
                          className="mr-1 mousetrap"
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
            className="btn-action pr-2 py-3 select-none"
            onClick={addFile}
          >
            + Add File
          </button>
        </div>
      )}
    </StyledWrapper>
  );
};

export default ResponseExampleFileBody;
