import React from 'react';
import get from 'lodash/get';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash } from '@tabler/icons';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  addBinaryFile,
  updateBinaryFile,
  deleteBinaryFile
} from 'providers/ReduxStore/slices/collections';
import MultiLineEditor from 'components/MultiLineEditor';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import StyledWrapper from './StyledWrapper';
import FilePickerEditor from 'components/FilePickerEditor';
import { useEffect } from 'react';
import SingleLineEditor from 'components/SingleLineEditor/index';
import { isArray } from 'lodash';
import path from 'node:path';

const Binary = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const params = item.draft ? get(item, 'draft.request.body.binaryFile') : get(item, 'request.body.binaryFile');

  const addFile = () => {
    dispatch(
      addBinaryFile({
        itemUid: item.uid,
        collectionUid: collection.uid,
        type: 'binaryFile',
        value: [''],
      })
    );
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  
  const handleParamChange = (e, _param, type) => {

    const param = cloneDeep(_param);

    switch (type) {
    
      case 'value': {
        param.value = isArray(e.target.value) && e.target.value.length > 0 ? e.target.value : [''];
        param.name = param.value.length === 0  ? '': path.basename(param.value[0], path.extname(param.value[0]));
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
    dispatch(
      updateBinaryFile({
        param: param,
        itemUid: item.uid,
        collectionUid: collection.uid,
        name: param.name,
        value: param.value,
        contentType: param.contentType,
      })
    );
  };

  const handleRemoveParams = (param) => {
    dispatch(
      deleteBinaryFile({
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
            <td><div className="flex items-center justify-center">File</div></td>
            <td><div className="flex items-center justify-center">Content-Type</div></td>
            <td><div className="flex items-center justify-center">Enabled</div></td>
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
                          collection={collection}
                        />
                    </td>
                    <td>
                      <SingleLineEditor
                        className='flex items-center justify-center'
                        onSave={onSave}
                        theme={storedTheme}
                        placeholder="Auto"
                        value={param.contentType}
                        onChange={(newValue) =>
                          handleParamChange(
                            {
                              target: {
                                value: newValue
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
                          key={`radio-${param.uid}`}
                          type="radio"
                          name="enabled"
                          checked={param.enabled}
                          tabIndex="-1"
                          className="mr-1 mousetrap"
                          onChange={(e) => handleParamChange(e, param, 'enabled')}
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
export default Binary;
