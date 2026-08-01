import React, { useState, useCallback, useMemo, useRef } from 'react';
import get from 'lodash/get';
import { IconPlus } from '@tabler/icons';
import InfoTip from 'components/InfoTip';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import {
  moveQueryParam,
  updatePathParam,
  setQueryParams,
  setPathParams
} from 'providers/ReduxStore/slices/collections';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import MultiLineEditor from 'components/MultiLineEditor';
import EditableTable from 'components/EditableTable';
import { createDescriptionColumn } from 'components/EditableTable/descriptionColumn';
import StyledWrapper from './StyledWrapper';
import BulkEditor from '../../BulkEditor';
import { usePersistedState } from 'hooks/usePersistedState';
import { useTrackScroll } from 'hooks/useTrackScroll';

const QueryParams = ({ item, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const params = item.draft ? get(item, 'draft.request.params') : get(item, 'request.params');
  const queryParams = params.filter((param) => param.type === 'query');
  const pathParams = params.filter((param) => param.type === 'path');

  const [isBulkEditMode, setIsBulkEditMode] = useState(false);
  const wrapperRef = useRef(null);
  const [scroll, setScroll] = usePersistedState({ key: `request-params-scroll-${item.uid}`, default: 0 });
  useTrackScroll({ ref: wrapperRef, selector: '.flex-boundary', onChange: setScroll, initialValue: scroll });

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

  const handlePathParamChange = useCallback(
    (rowUid, key, value) => {
      const pathParam = pathParams.find((p) => p.uid === rowUid);
      if (pathParam) {
        dispatch(
          updatePathParam({
            pathParam: { ...pathParam, [key]: value },
            itemUid: item.uid,
            collectionUid: collection.uid
          })
        );
      }
    },
    [dispatch, pathParams, item.uid, collection.uid]
  );

  const handlePathParamsChange = useCallback((updatedParams) => {
    dispatch(setPathParams({
      collectionUid: collection.uid,
      itemUid: item.uid,
      params: updatedParams
    }));
  }, [dispatch, collection.uid, item.uid]);

  const handlePathParamSelect = useCallback((rowUid) => {
    handlePathParamChange(rowUid, 'enabled', true);
  }, [handlePathParamChange]);

  const addPathParamAlternate = useCallback((name) => {
    handlePathParamsChange([...pathParams, { name, value: '', description: '', enabled: false }]);
  }, [handlePathParamsChange, pathParams]);

  const pathParamNameCounts = useMemo(
    () => pathParams.reduce((counts, param) => counts.set(param.name, (counts.get(param.name) || 0) + 1), new Map()),
    [pathParams]
  );

  const canDeletePathParam = useCallback((row) => pathParamNameCounts.get(row.name) > 1, [pathParamNameCounts]);

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

  const descriptionColumnQuery = createDescriptionColumn({
    theme: storedTheme,
    onSave,
    onRun: handleRun,
    collection,
    item
  });

  const descriptionColumnPath = createDescriptionColumn({
    theme: storedTheme,
    onSave,
    onRun: handleRun,
    collection,
    item,
    onDescriptionChange: (newValue, { row }) => handlePathParamChange(row.uid, 'description', newValue)
  });

  const queryColumns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      placeholder: 'Name',
      width: '20%'
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
    },
    descriptionColumnQuery
  ];

  const pathColumns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      width: '20%',
      render: ({ row, value }) => (
        <div className="flex items-center justify-between gap-2 w-full">
          <span className="truncate">{value}</span>
          <button
            className="add-alternate"
            title={`Add another value for :${value}`}
            data-testid="path-param-add-alternate"
            onClick={() => addPathParamAlternate(row.name)}
          >
            <IconPlus strokeWidth={1.5} size={14} />
          </button>
        </div>
      )
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
    },
    descriptionColumnPath
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
    <StyledWrapper className="w-full flex flex-col" ref={wrapperRef}>
      <div className="flex-1">
        <div className="mb-3 title text-xs">
          <span>Query</span>
        </div>
        <EditableTable
          tableId="query-params"
          testId="query-params-table"
          columns={queryColumns}
          rows={queryParams || []}
          onChange={handleQueryParamsChange}
          defaultRow={defaultQueryRow}
          reorderable={true}
          onReorder={handleQueryParamDrag}
          columnWidths={queryParamsWidths}
          onColumnWidthsChange={(widths) => handleColumnWidthsChange('query-params', widths)}
          initialScroll={scroll}
        />
        <div className="bulk-edit-bar flex justify-end mt-2">
          <button className="btn-action text-link select-none" onClick={toggleBulkEditMode}>
            Bulk Edit
          </button>
        </div>

        <div className="mb-3 title text-xs flex items-stretch">
          <span>Path</span>
          <InfoTip className="tooltip-mod" infotipId="path-param-InfoTip">
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
            testId="path-params-table"
            columns={pathColumns}
            rows={pathParams}
            onChange={handlePathParamsChange}
            defaultRow={{}}
            radioGroupKey="name"
            onCheckboxChange={handlePathParamSelect}
            canDeleteRow={canDeletePathParam}
            showAddRow={false}
            columnWidths={pathParamsWidths}
            onColumnWidthsChange={(widths) => handleColumnWidthsChange('path-params', widths)}
            initialScroll={scroll}
          />
        ) : (
          <div className="title pr-2 py-3 mt-2 text-xs"></div>
        )}
      </div>
    </StyledWrapper>
  );
};

export default QueryParams;
