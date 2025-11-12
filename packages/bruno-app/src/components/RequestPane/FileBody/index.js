import React, { useState, useEffect } from 'react';
import { get, cloneDeep, isArray } from 'lodash';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { addFile as _addFile, updateFile, deleteFile } from 'providers/ReduxStore/slices/collections/index';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import FilePickerEditor from 'components/FilePickerEditor/index';
import SingleLineEditor from 'components/SingleLineEditor/index';

const FileBody = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const params = item.draft ? get(item, 'draft.request.body.file') : get(item, 'request.body.file');

  const [enabledFileUid, setEnableFileUid] = useState(params && params.length ? params[0].uid : '');

  const addFile = () => {
    dispatch(
      _addFile({
        itemUid: item.uid,
        collectionUid: collection.uid,
      })
    );
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleParamChange = (e, _param, type) => {
    const param = cloneDeep(_param);
    switch (type) {
      case 'filePath': {
        param.filePath = e.target.filePath;
        param.contentType = "";
        break;
      }
      case 'contentType': {
        param.contentType = e.target.contentType;
        break;
      }
      case 'selected': {
        param.selected = e.target.selected;
        setEnableFileUid(param.uid)
        break;
      }
    }
    dispatch(
      updateFile({
        param: param,
        itemUid: item.uid,
        collectionUid: collection.uid
      })
    );
  };

  const handleRemoveParams = (param) => {
    dispatch(
      deleteFile({
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
            <td>
              <div className="flex items-center justify-center">File</div>
            </td>
            <td>
              <div className="flex items-center justify-center">Content-Type</div>
            </td>
            <td>
              <div className="flex items-center justify-center">Selected</div>
            </td>
            <td></td>
          </tr>
        </thead>
        <tbody>
          {params && params.length
            ? params.map((param, index) => {
                return (
                  <tr key={param.uid}>
                    <td>
                      <FilePickerEditor
                        isSingleFilePicker={true}
                        value={param.filePath}
                        onChange={(path) =>
                          handleParamChange(
                            {
                              target: {
                                filePath: path
                              }
                            },
                            param,
                            'filePath'
                          )
                        }
                        collection={collection}
                      />
                    </td>
                    <td>
                      <SingleLineEditor
                        className="flex items-center justify-center"
                        onSave={onSave}
                        theme={storedTheme}
                        placeholder="Auto"
                        value={param.contentType}
                        onChange={(newValue) =>
                          handleParamChange(
                            {
                              target: {
                                contentType: newValue
                              }
                            },
                            param,
                            'contentType'
                          )
                        }
                        onRun={handleRun}
                        collection={collection}
                      />
                    </td>
                    <td>
                      <div className="flex items-center justify-center">
                        <input
                          key={param.uid}
                          type="radio"
                          name="selected"
                          checked={enabledFileUid === param.uid || param.selected}
                          tabIndex="-1"
                          className="mr-1 mousetrap"
                          onChange={(e) => handleParamChange(e, param, 'selected')}
                        />
                      </div>
                    </td>
                    <td>
                      <div className="flex items-center justify-center">
                        <button tabIndex="-1" onClick={() => handleRemoveParams(param)}>
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
      <div>
        <button className="btn-add-param text-link pr-2 pt-3 select-none" onClick={addFile}>
          + Add File
        </button>
      </div>
    </StyledWrapper>
  );
};
export default FileBody;