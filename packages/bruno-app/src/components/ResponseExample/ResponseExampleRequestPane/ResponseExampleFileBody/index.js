import React, { useState, useMemo, useCallback } from 'react';
import { get } from 'lodash';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { updateResponseExampleFileBodyParams } from 'providers/ReduxStore/slices/collections';
import mime from 'mime-types';
import path from 'utils/common/path';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';
import FilePickerEditor from 'components/FilePickerEditor/index';
import SingleLineEditor from 'components/SingleLineEditor/index';
import RadioButton from 'components/RadioButton';

const ResponseExampleFileBody = ({ item, collection, exampleUid, editMode = false }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  // Get file data from the specific example
  const params = useMemo(() => {
    const _params = item.draft
      ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.request?.body?.file || []
      : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.request?.body?.file || [];
    return Array.isArray(_params) ? _params : [];
  }, [item.draft, item.examples, item, exampleUid]);

  const handleParamsChange = useCallback((updatedParams) => {
    if (!editMode) return;

    dispatch(updateResponseExampleFileBodyParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: updatedParams
    }));
  }, [editMode, dispatch, item.uid, collection.uid, exampleUid]);

  const handleFilePathChange = useCallback((row, newFilePath, onChange) => {
    if (!editMode) return;

    const currentParams = params || [];
    const existingParam = currentParams.find((p) => p.uid === row.uid);

    let updatedParams;
    if (existingParam) {
      // Update existing param
      updatedParams = currentParams.map((p) => {
        if (p.uid === row.uid) {
          const updated = { ...p, filePath: newFilePath };
          // Auto-detect content type from file extension
          if (newFilePath) {
            const contentType = mime.contentType(path.extname(newFilePath));
            updated.contentType = contentType || '';
          } else {
            updated.contentType = '';
          }
          return updated;
        }
        return p;
      });
    } else {
      // Add new param (from EditableTable's empty row)
      // Deselect all existing params and select the new one
      const deselectedParams = currentParams.map((p) => ({ ...p, selected: false }));
      const newParam = {
        uid: row.uid,
        filePath: newFilePath,
        contentType: '',
        selected: true
      };
      // Auto-detect content type from file extension
      if (newFilePath) {
        const contentType = mime.contentType(path.extname(newFilePath));
        newParam.contentType = contentType || '';
      }
      updatedParams = [...deselectedParams, newParam];
    }

    handleParamsChange(updatedParams);
  }, [editMode, params, handleParamsChange]);

  const handleSelectedChange = useCallback((row, checked) => {
    if (!editMode) return;

    // When a file is selected, deselect all others and select this one
    const updatedParams = params.map((p) => ({
      ...p,
      selected: p.uid === row.uid ? checked : false
    }));

    handleParamsChange(updatedParams);
  }, [editMode, params, handleParamsChange]);

  const handleParamDrag = useCallback(({ updateReorderedItem }) => {
    if (!editMode) return;

    const reorderedParams = updateReorderedItem.map((uid) => {
      return params.find((p) => p.uid === uid);
    }).filter(Boolean);

    dispatch(updateResponseExampleFileBodyParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: reorderedParams
    }));
  }, [editMode, dispatch, item.uid, collection.uid, exampleUid, params]);

  const columns = [
    {
      key: 'filePath',
      name: 'File',
      isKeyField: true,
      placeholder: 'File',
      width: '50%',
      readOnly: !editMode,
      render: ({ row, value, onChange, isLastEmptyRow }) => (
        <FilePickerEditor
          isSingleFilePicker={true}
          value={value || ''}
          onChange={(newPath) => handleFilePathChange(row, newPath, onChange)}
          collection={collection}
          readOnly={!editMode}
          displayMode="labelAndIcon"
        />
      )
    },
    {
      key: 'contentType',
      name: 'Content-Type',
      placeholder: 'Auto',
      width: '30%',
      readOnly: !editMode,
      render: ({ value, onChange }) => (
        <SingleLineEditor
          className="flex items-center justify-center"
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
    },
    {
      key: 'selected',
      name: 'Selected',
      width: '20%',
      readOnly: !editMode,
      render: ({ row, value, onChange, isLastEmptyRow, rowIndex }) => (
        <div className="flex items-center justify-center pl-4">
          <RadioButton
            key={row.uid}
            id={`file-${row.uid}`}
            name="selectedFile"
            value={row.uid}
            checked={row.selected}
            onChange={(e) => handleSelectedChange(row, e.target.checked)}
            disabled={!editMode}
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
        showCheckbox={false}
        showDelete={editMode}
      />
    </StyledWrapper>
  );
};

export default ResponseExampleFileBody;
