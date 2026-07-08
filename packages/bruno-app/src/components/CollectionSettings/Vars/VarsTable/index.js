import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import MultiLineEditor from 'components/MultiLineEditor';
import InfoTip from 'components/InfoTip';
import DataTypeSelector from 'components/DataTypeSelector';
import VarValueCell from 'components/VarValueCell';
import { valueToString } from '@usebruno/common/utils';
import EditableTable from 'components/EditableTable';
import { createDescriptionColumn } from 'components/EditableTable/descriptionColumn';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { variableNameRegex } from 'utils/common/regex';
import { setCollectionVars } from 'providers/ReduxStore/slices/collections/index';

const VarsTable = ({ collection, vars, varType, initialScroll = 0 }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const tabs = useSelector((state) => state.tabs.tabs);
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);

  // Get column widths from Redux
  const focusedTab = tabs?.find((t) => t.uid === activeTabUid);
  const collectionVarsWidths = focusedTab?.tableColumnWidths?.['collection-vars'] || {};

  const handleColumnWidthsChange = (tableId, widths) => {
    dispatch(updateTableColumnWidths({ uid: activeTabUid, tableId, widths }));
  };

  const onSave = () => dispatch(saveCollectionSettings(collection.uid));

  const handleVarsChange = useCallback((updatedVars) => {
    dispatch(setCollectionVars({ collectionUid: collection.uid, vars: updatedVars, type: varType }));
  }, [dispatch, collection.uid, varType]);

  const getRowError = useCallback((row, index, key) => {
    if (key !== 'name') return null;
    if (!row.name || row.name.trim() === '') return null;
    if (!variableNameRegex.test(row.name)) {
      return 'Variable contains invalid characters. Must only contain alphanumeric characters, "-", "_", "."';
    }
    return null;
  }, []);

  const descriptionColumn = createDescriptionColumn({
    theme: storedTheme,
    onSave,
    collection,
    nameFromRowIndex: true
  });

  const columns = [
    {
      key: 'name',
      name: 'Name',
      isKeyField: true,
      placeholder: 'Name',
      width: '25%'
    },
    {
      key: 'value',
      name: varType === 'request' ? 'Value' : (
        <div className="flex items-center">
          <span>Expr</span>
          <InfoTip content="You can write any valid JS Template Literal here" infotipId={`collection-${varType}-var`} />
        </div>
      ),
      placeholder: varType === 'request' ? 'Value' : 'Expr',
      render: ({ row, value, onChange, isLastEmptyRow, rowIndex }) => (
        <VarValueCell
          editor={(
            <MultiLineEditor
              value={valueToString(value)}
              name={`${rowIndex}.value`}
              theme={storedTheme}
              onSave={onSave}
              onChange={onChange}
              collection={collection}
              placeholder={value == null || (typeof value === 'string' && value.trim() === '') ? (varType === 'request' ? 'Value' : 'Expr') : ''}
            />
          )}
          renderTypeSelector={!isLastEmptyRow && varType === 'request'
            ? ({ compact }) => (
                <DataTypeSelector
                  compact={compact}
                  variable={row}
                  theme={storedTheme}
                  collection={collection}
                  onChange={(fields) => {
                    const updated = (vars || []).map((v) => v.uid === row.uid ? { ...v, ...fields } : v);
                    handleVarsChange(updated);
                  }}
                />
              )
            : null}
        />
      )
    },
    descriptionColumn
  ];

  const defaultRow = {
    name: '',
    value: '',
    description: '',
    ...(varType === 'response' ? { local: false } : {})
  };

  return (
    <StyledWrapper className="w-full">
      <EditableTable
        tableId="collection-vars"
        testId={`collection-vars-${varType === 'response' ? 'res' : 'req'}`}
        columns={columns}
        rows={vars}
        onChange={handleVarsChange}
        defaultRow={defaultRow}
        getRowError={getRowError}
        columnWidths={collectionVarsWidths}
        onColumnWidthsChange={(widths) => handleColumnWidthsChange('collection-vars', widths)}
        initialScroll={initialScroll}
      />
    </StyledWrapper>
  );
};

export default VarsTable;
