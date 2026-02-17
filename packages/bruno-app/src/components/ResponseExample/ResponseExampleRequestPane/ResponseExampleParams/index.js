import React, { useState, useMemo, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import get from 'lodash/get';
import { moveResponseExampleParam, setResponseExampleParams } from 'providers/ReduxStore/slices/collections';
import EditableTable from 'components/EditableTable';
import SingleLineEditor from 'components/SingleLineEditor';
import BulkEditor from 'components/BulkEditor';
import InfoTip from 'components/InfoTip';
import StyledWrapper from './StyledWrapper';

const ResponseExampleParams = ({ editMode, item, collection, exampleUid }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const [isBulkEditMode, setIsBulkEditMode] = useState(false);

  const params = useMemo(() => {
    return item.draft
      ? get(item, 'draft.examples', []).find((e) => e.uid === exampleUid)?.request?.params || []
      : get(item, 'examples', []).find((e) => e.uid === exampleUid)?.request?.params || [];
  }, [item, exampleUid]);

  const queryParams = params.filter((param) => param.type === 'query');
  const pathParams = params.filter((param) => param.type === 'path');

  const handleQueryParamsChange = useCallback((updatedQueryParams) => {
    if (!editMode) {
      return;
    }

    // Merge updated query params with path params
    const allParams = [...updatedQueryParams, ...pathParams];
    dispatch(setResponseExampleParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: allParams
    }));
  }, [editMode, dispatch, item.uid, collection.uid, exampleUid, pathParams]);

  const handleQueryParamDrag = useCallback(({ updateReorderedItem }) => {
    if (!editMode) {
      return;
    }

    dispatch(moveResponseExampleParam({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      updateReorderedItem
    }));
  }, [editMode, dispatch, item.uid, collection.uid, exampleUid]);

  const handlePathParamsChange = useCallback((updatedPathParams) => {
    if (!editMode) {
      return;
    }

    // Merge updated path params with query params
    const allParams = [...queryParams, ...updatedPathParams];
    dispatch(setResponseExampleParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: allParams
    }));
  }, [editMode, dispatch, item.uid, collection.uid, exampleUid, queryParams]);

  const toggleBulkEditMode = () => {
    setIsBulkEditMode(!isBulkEditMode);
  };

  const handleBulkParamsChange = (newParams) => {
    if (!editMode) {
      return;
    }

    // Merge bulk edited query params with path params
    const allParams = [...newParams, ...pathParams];
    dispatch(setResponseExampleParams({
      itemUid: item.uid,
      collectionUid: collection.uid,
      exampleUid: exampleUid,
      params: allParams
    }));
  };

  if (isBulkEditMode && editMode) {
    return (
      <StyledWrapper className="w-full mt-3">
        <BulkEditor
          params={queryParams}
          onChange={handleBulkParamsChange}
          onToggle={toggleBulkEditMode}
        />
      </StyledWrapper>
    );
  }

  const queryColumns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      placeholder: 'Name',
      width: '40%',
      readOnly: !editMode,
      render: ({ value, onChange }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={() => {}}
          onChange={onChange}
          onRun={() => {}}
          collection={collection}
          variablesAutocomplete={true}
          readOnly={!editMode}
          placeholder={!value ? 'Name' : ''}
        />
      )
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      width: '60%',
      readOnly: !editMode,
      render: ({ value, onChange }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={() => {}}
          onChange={onChange}
          onRun={() => {}}
          collection={collection}
          variablesAutocomplete={true}
          readOnly={!editMode}
          placeholder={!value ? 'Value' : ''}
        />
      )
    }
  ];

  const pathColumns = [
    {
      key: 'name',
      name: 'Name',
      readOnly: true,
      width: '40%'
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      width: '60%',
      readOnly: !editMode,
      render: ({ value, onChange }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={() => {}}
          onChange={onChange}
          onRun={() => {}}
          collection={collection}
          variablesAutocomplete={true}
          readOnly={!editMode}
          placeholder={!value ? 'Value' : ''}
        />
      )
    }
  ];

  const defaultQueryRow = {
    name: '',
    value: '',
    enabled: true,
    type: 'query'
  };

  if (queryParams.length === 0 && pathParams.length === 0 && !editMode) {
    return null;
  }

  return (
    <StyledWrapper className="w-full mt-4">
      <div className="mb-3 title text-xs font-bold">Query parameters</div>
      <EditableTable
        columns={queryColumns}
        rows={queryParams || []}
        onChange={handleQueryParamsChange}
        defaultRow={defaultQueryRow}
        reorderable={editMode}
        onReorder={handleQueryParamDrag}
        showAddRow={editMode}
        showDelete={editMode}
        disableCheckbox={!editMode}
      />
      {editMode && (
        <div className="flex justify-end mt-2">
          <button
            className="btn-action text-link select-none"
            onClick={toggleBulkEditMode}
          >
            Bulk Edit
          </button>
        </div>
      )}
      {pathParams && pathParams.length > 0 && (
        <>
          <div className="mb-3 title text-xs font-bold flex items-stretch mt-4">
            <span>Path parameters</span>
            <InfoTip infotipId="path-param-InfoTip">
              <div>
                Path variables are automatically added whenever the
                <code className="font-mono mx-2">:name</code>
                template is used in the URL. <br /> For example:
                <code className="font-mono mx-2">
                  https://example.com/v1/users/<span>:id</span>
                </code>
              </div>
            </InfoTip>
          </div>
          <EditableTable
            columns={pathColumns}
            rows={pathParams}
            onChange={handlePathParamsChange}
            defaultRow={{}}
            showCheckbox={false}
            showDelete={false}
            showAddRow={false}
            reorderable={false}
          />
        </>
      )}

    </StyledWrapper>
  );
};

export default ResponseExampleParams;
