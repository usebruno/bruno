import React, { useCallback, useRef, useEffect } from 'react';
import { get } from 'lodash';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { IconUpload, IconX, IconFile } from '@tabler/icons';
import { addFile, updateFile, deleteFile } from 'providers/ReduxStore/slices/collections/index';
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
  const files = item.draft ? get(item, 'draft.request.body.file') : get(item, 'request.body.file');

  // Ref to store pending file data for newly added files
  const pendingFileRef = useRef(null);

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  // Helper to get fresh files from item (avoids stale closures)
  const getFiles = useCallback(() => {
    return item.draft ? get(item, 'draft.request.body.file') : get(item, 'request.body.file') || [];
  }, [item]);

  // Effect to handle updating newly added files with their pending file path
  useEffect(() => {
    if (pendingFileRef.current && files && files.length > 0) {
      const newFile = files[files.length - 1];

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
  }, [files, dispatch, item.uid, collection.uid]);

  const handleFilePathChange = useCallback((row, newFilePath) => {
    const currentFiles = getFiles();
    const existingFile = currentFiles.find((f) => f.uid === row.uid);

    if (existingFile) {
      const updatedFile = { ...existingFile, filePath: newFilePath };
      // Auto-detect content type from file extension
      if (newFilePath) {
        const contentType = mime.contentType(path.extname(newFilePath));
        updatedFile.contentType = contentType || '';
      } else {
        updatedFile.contentType = '';
      }

      dispatch(updateFile({
        param: updatedFile,
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
    }
  }, [dispatch, item.uid, collection.uid, getFiles]);

  const handleBrowseFile = useCallback((row) => {
    const currentFiles = getFiles();
    const existingFile = currentFiles.find((f) => f.uid === row.uid);
    const isNewRow = !existingFile;

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
            // Store the pending file data - useEffect will apply it when files updates
            pendingFileRef.current = { filePath: processedPath, contentType };

            // Add a new file entry
            dispatch(addFile({
              itemUid: item.uid,
              collectionUid: collection.uid
            }));
          } else {
            handleFilePathChange(row, processedPath);
          }
        }
      })
      .catch((error) => {
        console.error(error);
      });
  }, [dispatch, collection.pathname, handleFilePathChange, item.uid, collection.uid, getFiles]);

  const handleClearFile = useCallback((row) => {
    handleFilePathChange(row, '');
  }, [handleFilePathChange]);

  const handleContentTypeChange = useCallback((row, newContentType) => {
    const currentFiles = getFiles();
    const existingFile = currentFiles.find((f) => f.uid === row.uid);

    if (existingFile) {
      dispatch(updateFile({
        param: { ...existingFile, contentType: newContentType },
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
    }
  }, [dispatch, item.uid, collection.uid, getFiles]);

  const handleSelectedChange = useCallback((row, checked) => {
    const currentFiles = getFiles();
    const existingFile = currentFiles.find((f) => f.uid === row.uid);

    if (existingFile && checked) {
      // The Redux updateFile action automatically deselects all others when selecting one
      dispatch(updateFile({
        param: { ...existingFile, selected: true },
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
    }
  }, [dispatch, item.uid, collection.uid, getFiles]);

  const handleFilesChange = useCallback((updatedFiles) => {
    // Filter out empty rows (rows with no filePath)
    const validFiles = updatedFiles.filter((f) => f.filePath && f.filePath.trim() !== '');
    const currentFiles = getFiles();
    const currentUids = new Set(currentFiles.map((f) => f.uid));
    const validUids = new Set(validFiles.map((f) => f.uid));

    // Find and delete removed files
    currentFiles
      .filter((f) => !validUids.has(f.uid))
      .forEach((f) => {
        dispatch(deleteFile({
          paramUid: f.uid,
          itemUid: item.uid,
          collectionUid: collection.uid
        }));
      });

    // Update existing files if changed
    validFiles.forEach((updatedFile) => {
      if (currentUids.has(updatedFile.uid)) {
        const currentFile = currentFiles.find((f) => f.uid === updatedFile.uid);
        if (
          updatedFile.filePath !== currentFile.filePath
          || updatedFile.contentType !== currentFile.contentType
          || updatedFile.selected !== currentFile.selected
        ) {
          dispatch(updateFile({
            param: updatedFile,
            itemUid: item.uid,
            collectionUid: collection.uid
          }));
        }
      }
    });
  }, [dispatch, item.uid, collection.uid, getFiles]);

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
      render: ({ row, rowIndex }) => (
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
        rows={files || []}
        onChange={handleFilesChange}
        defaultRow={defaultRow}
        showAddRow={true}
        showCheckbox={false}
      />
    </StyledWrapper>
  );
};

export default FileBody;
