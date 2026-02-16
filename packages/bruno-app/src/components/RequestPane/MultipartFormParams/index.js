import React, { useCallback } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { IconUpload, IconX, IconFile } from '@tabler/icons';
import {
  moveMultipartFormParam,
  setMultipartFormParams
} from 'providers/ReduxStore/slices/collections';
import { browseFiles } from 'providers/ReduxStore/slices/collections/actions';
import MultiLineEditor from 'components/MultiLineEditor';
import SingleLineEditor from 'components/SingleLineEditor';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';
import path from 'utils/common/path';
import { isWindowsOS } from 'utils/common/platform';

const MultipartFormParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const params = item.draft ? get(item, 'draft.request.body.multipartForm') : get(item, 'request.body.multipartForm');

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleParamsChange = useCallback((updatedParams) => {
    dispatch(setMultipartFormParams({
      collectionUid: collection.uid,
      itemUid: item.uid,
      params: updatedParams
    }));
  }, [dispatch, collection.uid, item.uid]);

  const handleParamDrag = useCallback(({ updateReorderedItem }) => {
    dispatch(moveMultipartFormParam({
      collectionUid: collection.uid,
      itemUid: item.uid,
      updateReorderedItem
    }));
  }, [dispatch, collection.uid, item.uid]);

  const handleBrowseFiles = useCallback((row, onChange) => {
    dispatch(browseFiles())
      .then((filePaths) => {
        const processedPaths = filePaths.map((filePath) => {
          const collectionDir = collection.pathname;
          if (filePath.startsWith(collectionDir)) {
            return path.relative(collectionDir, filePath);
          }
          return filePath;
        });

        const currentParams = item.draft
          ? get(item, 'draft.request.body.multipartForm')
          : get(item, 'request.body.multipartForm');
        const updatedParams = (currentParams || []).map((p) => {
          if (p.uid === row.uid) {
            return { ...p, type: 'file', value: processedPaths };
          }
          return p;
        });
        handleParamsChange(updatedParams);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [dispatch, collection.pathname, item, handleParamsChange]);

  const handleClearFile = useCallback((row) => {
    const currentParams = params || [];
    const updatedParams = currentParams.map((p) => {
      if (p.uid === row.uid) {
        return { ...p, type: 'text', value: '' };
      }
      return p;
    });
    handleParamsChange(updatedParams);
  }, [params, handleParamsChange]);

  const handleValueChange = useCallback((row, newValue, onChange) => {
    const currentParams = params || [];
    const existingParam = currentParams.find((p) => p.uid === row.uid);
    if (existingParam) {
      const updatedParams = currentParams.map((p) => {
        if (p.uid === row.uid) {
          return { ...p, type: 'text', value: newValue };
        }
        return p;
      });
      handleParamsChange(updatedParams);
    } else {
      onChange(newValue);
    }
  }, [params, handleParamsChange]);

  const getFileName = (filePaths) => {
    if (!filePaths || (Array.isArray(filePaths) && filePaths.length === 0)) {
      return null;
    }
    const paths = Array.isArray(filePaths) ? filePaths : [filePaths];
    const validPaths = paths.filter((v) => v != null && v !== '');
    if (validPaths.length === 0) return null;

    const separator = isWindowsOS() ? '\\' : '/';
    if (validPaths.length === 1) {
      return validPaths[0].split(separator).pop();
    }
    return `${validPaths.length} file(s)`;
  };

  const columns = [
    {
      key: 'name',
      name: 'Key',
      isKeyField: true,
      placeholder: 'Key',
      width: '30%'
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      width: '35%',
      render: ({ row, value, onChange, isLastEmptyRow }) => {
        const isFile = row.type === 'file';
        const fileName = isFile ? getFileName(value) : null;
        const hasTextValue = !isFile && value && value.length > 0;

        if (fileName) {
          return (
            <div className="flex items-center file-value-cell">
              <IconFile size={16} className="text-muted mr-1" />
              <span className="file-name flex-1 truncate" title={Array.isArray(value) ? value.join(', ') : value}>
                {fileName}
              </span>
              <button
                className="clear-file-btn ml-1"
                onClick={() => handleClearFile(row)}
                title="Remove file"
              >
                <IconX size={16} />
              </button>
            </div>
          );
        }

        return (
          <div className="flex items-center value-cell">
            <div className="flex-1">
              <MultiLineEditor
                onSave={onSave}
                theme={storedTheme}
                value={value || ''}
                onChange={(newValue) => handleValueChange(row, newValue, onChange)}
                onRun={handleRun}
                allowNewlines={true}
                collection={collection}
                item={item}
                placeholder={!value ? 'Value' : ''}
              />
            </div>
            {!hasTextValue && !isLastEmptyRow && (
              <button
                className="upload-btn ml-1"
                onClick={() => handleBrowseFiles(row, onChange)}
                title="Select file"
              >
                <IconUpload size={16} />
              </button>
            )}
          </div>
        );
      }
    },
    {
      key: 'contentType',
      name: 'Content-Type',
      placeholder: 'Auto',
      width: '20%',
      render: ({ value, onChange }) => (
        <SingleLineEditor
          onSave={onSave}
          theme={storedTheme}
          placeholder={!value ? 'Auto' : ''}
          value={value || ''}
          onChange={onChange}
          onRun={handleRun}
          collection={collection}
        />
      )
    }
  ];

  const defaultRow = {
    name: '',
    value: '',
    contentType: '',
    type: 'text'
  };

  return (
    <StyledWrapper className="w-full">
      <EditableTable
        columns={columns}
        rows={params || []}
        onChange={handleParamsChange}
        defaultRow={defaultRow}
        reorderable={true}
        onReorder={handleParamDrag}
      />
    </StyledWrapper>
  );
};

export default MultipartFormParams;
