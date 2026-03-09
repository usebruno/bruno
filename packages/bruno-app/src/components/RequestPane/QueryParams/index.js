import React, { useState, useCallback } from 'react';
import get from 'lodash/get';
import InfoTip from 'components/InfoTip';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  moveQueryParam,
  updatePathParam,
  setQueryParams
} from 'providers/ReduxStore/slices/collections';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import MultiLineEditor from 'components/MultiLineEditor';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';
import BulkEditor from '../../BulkEditor';

const QueryParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const params = item.draft ? get(item, 'draft.request.params') : get(item, 'request.params');
  const queryParams = params.filter((param) => param.type === 'query');
  const pathParams = params.filter((param) => param.type === 'path');

  const [isBulkEditMode, setIsBulkEditMode] = useState(false);

  // Get column widths from Redux
  const focusedTab = tabs?.find((t) => t.uid === activeTabUid);
  const queryParamsWidths = focusedTab?.tableColumnWidths?.['query-params'] || {};
  const pathParamsWidths = focusedTab?.tableColumnWidths?.['path-params'] || {};

  const handleColumnWidthsChange = (tableId, widths) => {
    dispatch(updateTableColumnWidths({ uid: activeTabUid, tableId, widths }));
  };

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleQueryParamsChange = useCallback((updatedParams) => {
    const paramsWithType = updatedParams.map((p) => ({ ...p, type: 'query' }));
    dispatch(setQueryParams({
      collectionUid: collection.uid,
      itemUid: item.uid,
      params: paramsWithType
    }));
  }, [dispatch, collection.uid, item.uid]);

  const handlePathParamChange = useCallback((rowUid, key, value) => {
    const pathParam = pathParams.find((p) => p.uid === rowUid);
    if (pathParam) {
      dispatch(updatePathParam({
        pathParam: { ...pathParam, [key]: value },
        itemUid: item.uid,
        collectionUid: collection.uid
      }));
    }
  }, [dispatch, pathParams, item.uid, collection.uid]);

  const handleQueryParamDrag = useCallback(({ updateReorderedItem }) => {
    dispatch(moveQueryParam({
      collectionUid: collection.uid,
      itemUid: item.uid,
      updateReorderedItem
    }));
  }, [dispatch, collection.uid, item.uid]);

  const toggleBulkEditMode = () => {
    setIsBulkEditMode(!isBulkEditMode);
  };

  const queryColumns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      placeholder: 'Name',
      width: '30%'
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      render: ({ value, onChange }) => (
        <MultiLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={onSave}
          onChange={onChange}
          onRun={handleRun}
          collection={collection}
          item={item}
          variablesAutocomplete={true}
          placeholder={!value ? 'Value' : ''}
        />
      )
    }
  ];

  const pathColumns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      width: '30%',
      readOnly: true
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      render: ({ row, value, onChange }) => (
        <MultiLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={onSave}
          onChange={(newValue) => handlePathParamChange(row.uid, 'value', newValue)}
          onRun={handleRun}
          collection={collection}
          item={item}
        />
      )
    }
  ];

  const defaultQueryRow = {
    name: '',
    value: '',
    description: '',
    type: 'query'
  };

  if (isBulkEditMode) {
    return (
      <StyledWrapper className="w-full mt-3">
        <BulkEditor
          params={queryParams}
          onChange={handleQueryParamsChange}
          onToggle={toggleBulkEditMode}
          onSave={onSave}
          onRun={handleRun}
        />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="w-full flex flex-col">
      <div className="flex-1">
        <div className="mb-3 title text-xs">Query</div>
        <EditableTable
          tableId="query-params"
          columns={queryColumns}
          rows={queryParams || []}
          onChange={handleQueryParamsChange}
          defaultRow={defaultQueryRow}
          reorderable={true}
          onReorder={handleQueryParamDrag}
          columnWidths={queryParamsWidths}
          onColumnWidthsChange={(widths) => handleColumnWidthsChange('query-params', widths)}
        />
        <div className="flex justify-end mt-2">
          <button className="btn-action text-link select-none" onClick={toggleBulkEditMode}>
            Bulk Edit
          </button>
        </div>

        <div className="mb-3 title text-xs flex items-stretch">
          <span>Path</span>
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
        {pathParams && pathParams.length > 0 ? (
          <EditableTable
            tableId="path-params"
            columns={pathColumns}
            rows={pathParams}
            onChange={() => {}}
            defaultRow={{}}
            showCheckbox={false}
            showDelete={false}
            showAddRow={false}
            columnWidths={pathParamsWidths}
            onColumnWidthsChange={(widths) => handleColumnWidthsChange('path-params', widths)}
          />
        ) : (
          <div className="title pr-2 py-3 mt-2 text-xs"></div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default QueryParams;
