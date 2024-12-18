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

const Binary = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const params = item.draft ? get(item, 'draft.request.body.binaryFile') : get(item, 'request.body.binaryFile');

 useEffect(() => {
    dispatch(
      addBinaryFile({
        itemUid: item.uid,
        collectionUid: collection.uid,
        contentType: '',
        type: 'binaryFile',
        fileName: '',
        filePath: ''
      })
    );
  }, []);

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));
  
  const handleParamChange = (e, _param, type) => {

    const param = cloneDeep(_param);
    switch (type) {
      case 'name': {
        param.name = e.target.value;
        break;
      }

      case 'filePath': {
        param.filePath = e.target.value;
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
        filePath: param.filePath,
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
            <td><div className="flex items-center justify-center">Ativo</div></td>
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
                          onChange={(newValue) =>
                            handleParamChange(
                              {
                                target: {
                                  value: newValue
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
                          type="checkbox"
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
    </StyledWrapper>
  );
};
export default Binary;
