import { IconInfoCircle } from '@tabler/icons';
import EditableTable from 'components/EditableTable';
import SingleLineEditor from 'components/SingleLineEditor';
import { headers as StandardHTTPHeaders } from 'know-your-http-well';
import get from 'lodash/get';
import { moveRequestHeader, setRequestHeaders } from 'providers/ReduxStore/slices/collections';
import { saveRequest, sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import { useTheme } from 'providers/Theme';
import React, { useCallback, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import { Tooltip } from 'react-tooltip';
import { MimeTypes } from 'utils/codemirror/autocompleteConstants';
import { getTreePathFromCollectionToItem } from 'utils/collections/index';
import BulkEditor from '../../BulkEditor';
import StyledWrapper from './StyledWrapper';

const headerAutoCompleteList = StandardHTTPHeaders.map((e) => e.header);

const RequestHeaders = ({ item, collection, addHeaderText }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');

  const allHeaders = useMemo(() => {
    const requestTreePath = getTreePathFromCollectionToItem(collection, item);
    const folderHeaders = [];
    for (const pathItem of requestTreePath) {
      if (pathItem.type === 'folder') {
        const fHeaders = pathItem.draft ? get(pathItem, 'draft.request.headers', []) : get(pathItem, 'root.request.headers', []);
        fHeaders.forEach((h) => folderHeaders.push({ header: h, folder: pathItem }));
      }
    }

    const collectionHeaders = collection.draft?.root
      ? get(collection, 'draft.root.request.headers', [])
      : get(collection, 'root.request.headers', []);

    const categorizedHeaders = {
      request: (headers || []).map((h) => ({
        ...h,
        source: 'request',
        editable: true,
        description: `Request: ${item.name}`,
        rowKey: `request-${h.uid}`
      })),
      folder: (folderHeaders || []).map(({ header, folder }) => ({
        ...header,
        source: 'folder',
        editable: false,
        description: `Folder: ${folder.name}`,
        rowKey: `folder-${header.uid}`
      })),
      collection: (collectionHeaders || []).map((h) => ({
        ...h,
        source: 'collection',
        editable: false,
        description: `Collection: ${collection.name}`,
        rowKey: `collection-${h.uid}`
      }))
    };

    return Object.values(categorizedHeaders).flat();
  }, [headers, collection, item]);

  const [isBulkEditMode, setIsBulkEditMode] = useState(false);

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleHeadersChange = useCallback(
    (updatedHeaders) => {
      const requestHeaders = updatedHeaders
        .filter((h) => h.source === 'request' || !h.source)
        .map((h) => {
          const { source, editable, description, rowKey, ...rest } = h;
          return rest;
        });

      dispatch(
        setRequestHeaders({
          collectionUid: collection.uid,
          itemUid: item.uid,
          headers: requestHeaders
        })
      );
    },
    [dispatch, collection.uid, item.uid]
  );

  const handleHeaderDrag = useCallback(
    ({ updateReorderedItem }) => {
      // Filter to only include request header UIDs - excluding folder and collection headers
      const requestHeaderUids = new Set(
        allHeaders.filter((h) => h.source === 'request').map((h) => h.uid)
      );
      const filteredReorderedItem = updateReorderedItem.filter((uid) => requestHeaderUids.has(uid));

      dispatch(
        moveRequestHeader({
          collectionUid: collection.uid,
          itemUid: item.uid,
          updateReorderedItem: filteredReorderedItem
        })
      );
    },
    [dispatch, collection.uid, item.uid, allHeaders]
  );

  const toggleBulkEditMode = () => {
    setIsBulkEditMode(!isBulkEditMode);
  };

  const columns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      placeholder: 'Name',
      width: '50%',
      render: ({ row, value, onChange, isLastEmptyRow }) => (
        <div className="flex items-center w-full">
          <SingleLineEditor
            value={value || ''}
            theme={storedTheme}
            readOnly={row.editable === false}
            onSave={onSave}
            onChange={(newValue) => onChange(newValue.replace(/[\r\n]/g, ''))}
            autocomplete={headerAutoCompleteList}
            onRun={handleRun}
            collection={collection}
            item={item}
            placeholder={isLastEmptyRow ? 'Name' : ''}
          />
          {row.editable === false && (
            <button
              type="button"
              className="ml-1 flex items-center text-muted"
              aria-label={`Inherited from ${row.description}`}
              aria-describedby={`row-info-${row.source}-${row.uid}`}
            >
              <IconInfoCircle size={16} strokeWidth={1.5} data-tooltip-id={`row-info-${row.source}-${row.uid}`} />
              <Tooltip className="tooltip-mod" id={`row-info-${row.source}-${row.uid}`} html={`Inherited from ${row.description}`} />
            </button>
          )}
        </div>
      )
    },
    {
      key: 'value',
      name: 'Value',
      placeholder: 'Value',
      width: '50%',
      render: ({ row, value, onChange, isLastEmptyRow }) => (
        <SingleLineEditor
          value={value || ''}
          theme={storedTheme}
          readOnly={row.editable === false}
          onSave={onSave}
          onChange={onChange}
          onRun={handleRun}
          autocomplete={MimeTypes}
          collection={collection}
          item={item}
          placeholder={isLastEmptyRow ? 'Value' : ''}
        />
      )
    }
  ];

  const defaultRow = {
    name: '',
    value: '',
    description: ''
  };

  if (isBulkEditMode) {
    return (
      <StyledWrapper className="w-full mt-3">
        <div className="mb-2 text-xs text-muted flex items-center">
          <IconInfoCircle size={14} strokeWidth={1.5} className="mr-1" />
          <span>
            Bulk edit applies only to request-level headers. Headers inherited from folders and collections are not shown here.
          </span>
        </div>
        <BulkEditor params={headers} onChange={handleHeadersChange} onToggle={toggleBulkEditMode} onSave={onSave} onRun={handleRun} />
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper className="w-full">
      <EditableTable
        columns={columns}
        rows={allHeaders || []}
        onChange={handleHeadersChange}
        defaultRow={defaultRow}
        reorderable={true}
        onReorder={handleHeaderDrag}
      />
      <div className="flex justify-end mt-2">
        <button className="btn-action text-link select-none" onClick={toggleBulkEditMode}>
          Bulk Edit
        </button>
      </div>
    </StyledWrapper>
  );
};

export default RequestHeaders;
