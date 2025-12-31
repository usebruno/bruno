import React, { useCallback, useRef, useEffect } from 'react';
import { get } from 'lodash';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { IconUpload, IconX, IconFile } from '@tabler/icons';
import { addFile as _addFile, updateFile, deleteFile } from 'providers/ReduxStore/slices/collections/index';
import { browseFiles } from 'providers/ReduxStore/slices/collections/actions';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import mime from 'mime-types';
import path from 'utils/common/path';
import EditableTable from 'components/EditableTable';
import SingleLineEditor from 'components/SingleLineEditor';
import RadioButton from 'components/RadioButton';
import StyledWrapper from './StyledWrapper';
import { isWindowsOS } from 'utils/common/platform';

const FileBody = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const params = item.draft ? get(item, 'draft.request.body.file') : get(item, 'request.body.file');

  // Ref to store pending file data for newly added files
  const pendingFileRef = useRef(null);

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  // Effect to handle updating newly added files with their pending file path
  useEffect(() => {
    if (pendingFileRef.current && params && params.length > 0) {
      const { filePath, contentType } = pendingFileRef.current;
      const newFile = params[params.length - 1];

      // Only update if the new file doesn't have a filePath yet (freshly added)
      if (newFile && (!newFile.filePath || newFile.filePath.trim() === '')) {
        const pendingData = pendingFileRef.current;
        pendingFileRef.current = null;

        dispatch(updateFile({
          param: {
            ...newFile,
            filePath: pendingData.filePath,
            contentType: pendingData.contentType
          },
          itemUid: item.uid,
          collectionUid: collection.uid
        }));
      }
    }
  }, [params, dispatch, item.uid, collection.uid]);

  // Unified handler for EditableTable onChange
  const handleParamsChange = useCallback((updatedParams) => {
    // Filter out empty rows (rows with no filePath)
    const validParams = updatedParams.filter((p) => p.filePath && p.filePath.trim() !== '');
    // Read current params fresh from item to avoid stale closures
    const currentParams = item.draft ? get(item, 'draft.request.body.file') : get(item, 'request.body.file') || [];
    const currentUids = new Set(currentParams.map((p) => p.uid));
    const validUids = new Set(validParams.map((p) => p.uid));

    // Find deleted params
    const deletedUids = currentParams
      .filter((p) => !validUids.has(p.uid))
      .map((p) => p.uid);

    // Delete removed params
    deletedUids.forEach((uid) => {
      dispatch(deleteFile({
        paramUid: uid,
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
    });

    // Update existing params
    validParams.forEach((updatedParam) => {
      if (currentUids.has(updatedParam.uid)) {
        const currentParam = currentParams.find((p) => p.uid === updatedParam.uid);
        // Only update if something changed
        if (
          updatedParam.filePath !== currentParam.filePath
          || updatedParam.contentType !== currentParam.contentType
          || updatedParam.selected !== currentParam.selected
        ) {
          dispatch(updateFile({
            param: updatedParam,
            itemUid: item.uid,
            collectionUid: collection.uid
          }));
        }
      }
    });
  }, [dispatch, item, collection.uid]);

  const handleFilePathChange = useCallback((paramUid, newFilePath) => {
    // Read current params fresh from item to avoid stale closures
    const currentParams = item.draft ? get(item, 'draft.request.body.file') : get(item, 'request.body.file') || [];
    const existingParam = currentParams.find((p) => p.uid === paramUid);

    if (existingParam) {
      // Update existing param
      const updatedParam = { ...existingParam, filePath: newFilePath };
      // Auto-detect content type from file extension
      if (newFilePath) {
        const contentType = mime.contentType(path.extname(newFilePath));
        updatedParam.contentType = contentType || '';
      } else {
        updatedParam.contentType = '';
      }

      dispatch(updateFile({
        param: updatedParam,
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
    }
  }, [dispatch, item, collection.uid]);

  const handleBrowseFile = useCallback((row) => {
    // Read current params fresh from item to avoid stale closures
    const currentParams = item.draft ? get(item, 'draft.request.body.file') : get(item, 'request.body.file') || [];
    const existingParam = currentParams.find((p) => p.uid === row.uid);
    const isNewRow = !existingParam;

    dispatch(browseFiles())
      .then((filePaths) => {
        if (filePaths && filePaths.length > 0) {
          const filePath = filePaths[0];
          const collectionDir = collection.pathname;
          const processedPath = filePath.startsWith(collectionDir)
            ? path.relative(collectionDir, filePath)
            : filePath;
          const contentType = mime.contentType(path.extname(processedPath)) || '';

          if (isNewRow) {
            // Store the pending file data - useEffect will apply it when params updates
            pendingFileRef.current = { filePath: processedPath, contentType };

            // Add a new file entry
            dispatch(_addFile({
              itemUid: item.uid,
              collectionUid: collection.uid
            }));
          } else {
            // Update existing file - read fresh params to get the uid
            handleFilePathChange(row.uid, processedPath);
          }
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }, [dispatch, collection.pathname, handleFilePathChange, item, collection.uid]);

  const handleClearFile = useCallback((row) => {
    handleFilePathChange(row.uid, '');
  }, [handleFilePathChange]);

  const handleContentTypeChange = useCallback((row, newContentType) => {
    // Read current params fresh from item to avoid stale closures
    const currentParams = item.draft ? get(item, 'draft.request.body.file') : get(item, 'request.body.file') || [];
    const existingParam = currentParams.find((p) => p.uid === row.uid);

    if (existingParam) {
      const updatedParam = { ...existingParam, contentType: newContentType };
      dispatch(updateFile({
        param: updatedParam,
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
    }
  }, [dispatch, item, collection.uid]);

  const handleSelectedChange = useCallback((row, checked) => {
    // Read current params fresh from item to avoid stale closures
    const currentParams = item.draft ? get(item, 'draft.request.body.file') : get(item, 'request.body.file') || [];
    const existingParam = currentParams.find((p) => p.uid === row.uid);

    if (existingParam && checked) {
      // The Redux updateFile action automatically deselects all others when selecting one
      dispatch(updateFile({
        param: {
          ...existingParam,
          selected: true
        },
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
    }
  }, [dispatch, item, collection.uid]);

  const handleParamDrag = useCallback(({ updateReorderedItem }) => {
    // Read current params fresh from item to avoid stale closures
    const currentParams = item.draft ? get(item, 'draft.request.body.file') : get(item, 'request.body.file') || [];
    const reorderedParams = updateReorderedItem.map((uid) => {
      return currentParams.find((p) => p.uid === uid);
    }).filter(Boolean);

    handleParamsChange(reorderedParams);
  }, [item, handleParamsChange]);

  const getFileName = (filePath) => {
    if (!filePath) return null;
    const separator = isWindowsOS() ? '\\' : '/';
    return filePath.split(separator).pop();
  };

  const columns = [
    {
      key: 'filePath',
      name: 'File',
      isKeyField: true,
      placeholder: 'File',
      width: '50%',
      render: ({ row, value, isLastEmptyRow }) => {
        const fileName = getFileName(value);

        if (fileName) {
          return (
            <div className="flex items-center file-value-cell">
              <IconFile size={16} className="file-icon mr-1" />
              <span className="file-name flex-1 truncate" title={value}>
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
            <span className="flex-1 placeholder-text">{isLastEmptyRow ? 'Select a file' : ''}</span>
            <button
              className="upload-btn ml-1"
              onClick={() => handleBrowseFile(row)}
              title="Select file"
            >
              <IconUpload size={16} />
            </button>
          </div>
        );
      }
    },
    {
      key: 'contentType',
      name: 'Content-Type',
      placeholder: 'Auto',
      width: '30%',
      render: ({ row, value, isLastEmptyRow }) => (
        <SingleLineEditor
          className="flex items-center justify-center"
          onSave={onSave}
          theme={storedTheme}
          placeholder={isLastEmptyRow ? 'Auto' : ''}
          value={value || ''}
          onChange={(newValue) => handleContentTypeChange(row, newValue)}
          onRun={handleRun}
          collection={collection}
        />
      )
    },
    {
      key: 'selected',
      name: 'Selected',
      width: '20%',
      render: ({ row, value, onChange, isLastEmptyRow, rowIndex }) => (
        <div className="flex items-center justify-center">
          <RadioButton
            key={row.uid}
            id={`file-${row.uid}`}
            name="selectedFile"
            value={row.uid}
            checked={row.selected || false}
            onChange={(e) => handleSelectedChange(row, e.target.checked)}
            className="mr-1 mousetrap"
            dataTestId={`file-radio-button-${rowIndex}`}
          />
        </div>
      )
    }
  ];

  const defaultRow = {
    filePath: '',
    contentType: '',
    selected: false
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
        showAddRow={true}
        showCheckbox={false}
      />
    </StyledWrapper>
  );
};

export default FileBody;
