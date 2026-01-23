import React, { useMemo, useCallback } from 'react';
import get from 'lodash/get';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { IconUpload, IconX, IconFile } from '@tabler/icons';
import { updateResponseExampleMultipartFormParams } from 'providers/ReduxStore/slices/collections';
import { browseFiles } from 'providers/ReduxStore/slices/collections/actions';
import mime from 'mime-types';
import path from 'utils/common/path';
import EditableTable from 'components/EditableTable';
import MultiLineEditor from 'components/MultiLineEditor';
import SingleLineEditor from 'components/SingleLineEditor';
import StyledWrapper from './StyledWrapper';
import { isWindowsOS } from 'utils/common/platform';

const ResponseExampleMultipartFormParams = ({ item, collection, exampleUid, editMode = false }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const params = useMemo(() => {
    return item.draft
      ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.request?.body?.multipartForm || []
      : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.request?.body?.multipartForm || [];
  }, [item, exampleUid]);

  const handleParamsChange = useCallback((updatedParams) => {
    if (!editMode) return;

    dispatch(updateResponseExampleMultipartFormParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: updatedParams
    }));
  }, [editMode, dispatch, item.uid, collection.uid, exampleUid]);

  const handleBrowseFiles = useCallback((row, onChange) => {
    if (!editMode) return;

    dispatch(browseFiles())
      .then((filePaths) => {
        const processedPaths = filePaths.map((filePath) => {
          const collectionDir = collection.pathname;
          if (filePath.startsWith(collectionDir)) {
            return path.relative(collectionDir, filePath);
          }
          return filePath;
        });

        const currentParams = params || [];
        const existingParam = currentParams.find((p) => p.uid === row.uid);

        let updatedParams;
        if (existingParam) {
          // Update existing param
          updatedParams = currentParams.map((p) => {
            if (p.uid === row.uid) {
              const updated = { ...p, type: 'file', value: processedPaths };
              // Auto-detect content type from first file
              if (processedPaths.length > 0) {
                const contentType = mime.contentType(path.extname(processedPaths[0]));
                updated.contentType = contentType || '';
              }
              return updated;
            }
            return p;
          });
        } else {
          // Add new param (from EditableTable's empty row)
          const newParam = {
            uid: row.uid,
            name: row.name || '',
            type: 'file',
            value: processedPaths,
            contentType: '',
            enabled: true
          };
          // Auto-detect content type from first file
          if (processedPaths.length > 0) {
            const contentType = mime.contentType(path.extname(processedPaths[0]));
            newParam.contentType = contentType || '';
          }
          updatedParams = [...currentParams, newParam];
        }

        handleParamsChange(updatedParams);
      })
      .catch((error) => {
        console.error(error);
      });
  }, [editMode, dispatch, collection.pathname, params, handleParamsChange]);

  const handleClearFile = useCallback((row) => {
    if (!editMode) return;

    const currentParams = params || [];
    const existingParam = currentParams.find((p) => p.uid === row.uid);

    if (existingParam) {
      const updatedParams = currentParams.map((p) => {
        if (p.uid === row.uid) {
          return { ...p, type: 'text', value: '' };
        }
        return p;
      });
      handleParamsChange(updatedParams);
    }
  }, [editMode, params, handleParamsChange]);

  const handleValueChange = useCallback((row, newValue, onChange) => {
    if (!editMode) return;

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
  }, [editMode, params, handleParamsChange]);

  const handleParamDrag = useCallback(({ updateReorderedItem }) => {
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
  }, [editMode, dispatch, item.uid, collection.uid, exampleUid, params]);

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
      width: '30%',
      readOnly: !editMode
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      width: '40%',
      readOnly: !editMode,
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
                onSave={() => {}}
                theme={storedTheme}
                value={value || ''}
                onChange={(newValue) => handleValueChange(row, newValue, onChange)}
                onRun={() => {}}
                allowNewlines={true}
                collection={collection}
                item={item}
                readOnly={!editMode}
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
      width: '30%',
      readOnly: !editMode,
      render: ({ value, onChange }) => (
        <SingleLineEditor
          onSave={() => {}}
          theme={storedTheme}
          placeholder={!value ? 'Auto' : ''}
          value={value || ''}
          onChange={onChange}
          onRun={() => {}}
          collection={collection}
          readOnly={!editMode}
        />
      )
    }
  ];

  const defaultRow = {
    name: '',
    value: '',
    contentType: '',
    enabled: true,
    type: 'text'
  };

  if (params.length === 0 && !editMode) {
    return null;
  }

  return (
    <StyledWrapper className="w-full mt-4">
      <EditableTable
        columns={columns}
        rows={params || []}
        onChange={handleParamsChange}
        defaultRow={defaultRow}
        reorderable={editMode}
        onReorder={handleParamDrag}
        showAddRow={editMode}
        showDelete={editMode}
        disableCheckbox={!editMode}
      />
    </StyledWrapper>
  );
};

export default ResponseExampleMultipartFormParams;
