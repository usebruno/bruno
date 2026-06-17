import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import MultiLineEditor from 'components/MultiLineEditor';
import InfoTip from 'components/InfoTip';
import DataTypeSelector from 'components/DataTypeSelector';
import { valueToString } from '@usebruno/common/utils';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { variableNameRegex } from 'utils/common/regex';
import { setFolderVars } from 'providers/ReduxStore/slices/collections/index';

const VarsTable = ({ folder, collection, vars, varType, initialScroll = 0 }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  // Get column widths from Redux
  const focusedTab = tabs?.find((t) => t.uid === activeTabUid);
  const folderVarsWidths = focusedTab?.tableColumnWidths?.['folder-vars'] || {};

  const handleColumnWidthsChange = (tableId, widths) => {
    dispatch(updateTableColumnWidths({ uid: activeTabUid, tableId, widths }));
  };

  const onSave = () => dispatch(saveFolderRoot(collection.uid, folder.uid));

  const handleVarsChange = useCallback((updatedVars) => {
    dispatch(setFolderVars({
      collectionUid: collection.uid,
      folderUid: folder.uid,
      vars: updatedVars,
      type: varType
    }));
  }, [dispatch, collection.uid, folder.uid, varType]);

  const getRowError = useCallback((row, index, key) => {
    if (key !== 'name') return null;
    if (!row.name || row.name.trim() === '') return null;
    if (!variableNameRegex.test(row.name)) {
      return 'Variable contains invalid characters. Must only contain alphanumeric characters, "-", "_", "."';
    }
    return null;
  }, []);

  const columns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      placeholder: 'Name',
      width: '40%'
    },
    {
      key: 'value',
      name: varType === 'request' ? 'Value' : (
        <div className="flex items-center">
          <span>Expr</span>
          <InfoTip content="You can write any valid JS expression here" infotipId={`folder-${varType}-var`} />
        </div>
      ),
      placeholder: varType === 'request' ? 'Value' : 'Expr',
      render: ({ row, value, onChange, isLastEmptyRow }) => (
        <div className="flex items-center w-full gap-2">
          <div className="flex-1 min-w-0">
            <MultiLineEditor
              value={valueToString(value)}
              theme={storedTheme}
              onSave={onSave}
              onChange={onChange}
              collection={collection}
              item={folder}
              placeholder={value == null || (typeof value === 'string' && value.trim() === '') ? (varType === 'request' ? 'Value' : 'Expr') : ''}
            />
          </div>
          {/* DataTypes apply to literal values, not to the JS expression that produces a post-response value. */}
          {!isLastEmptyRow && varType === 'request' && (
            <DataTypeSelector
              variable={row}
              theme={storedTheme}
              collection={collection}
              onChange={(fields) => {
                const updated = (vars || []).map((v) => v.uid === row.uid ? { ...v, ...fields } : v);
                handleVarsChange(updated);
              }}
            />
          )}
        </div>
      )
    }
  ];

  const defaultRow = {
    name: '',
    value: '',
    ...(varType === 'response' ? { local: false } : {})
  };

  return (
    <StyledWrapper className="w-full">
      <EditableTable
        tableId="folder-vars"
        testId={`folder-vars-${varType === 'response' ? 'res' : 'req'}`}
        columns={columns}
        rows={vars}
        onChange={handleVarsChange}
        defaultRow={defaultRow}
        getRowError={getRowError}
        columnWidths={folderVarsWidths}
        onColumnWidthsChange={(widths) => handleColumnWidthsChange('folder-vars', widths)}
        initialScroll={initialScroll}
      />
    </StyledWrapper>
  );
};

export default VarsTable;
