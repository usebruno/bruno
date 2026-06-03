import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import MultiLineEditor from 'components/MultiLineEditor';
import InfoTip from 'components/InfoTip';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { variableNameRegex } from 'utils/common/regex';
import { setCollectionVars } from 'providers/ReduxStore/slices/collections/index';
import { useTranslation } from 'react-i18next';

const VarsTable = ({ collection, vars, varType, initialScroll = 0 }) => {
  const { t } = useTranslation();
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
      return t('COLLECTION_SETTINGS.VARIABLE_INVALID_CHARACTERS');
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
      name: varType === 'request' ? t('COMMON.VALUE') : (
        <div className="flex items-center">
          <span>{t('COLLECTION_SETTINGS.EXPR')}</span>
          <InfoTip content="You can write any valid JS Template Literal here" infotipId={`collection-${varType}-var`} />
        </div>
      ),
      placeholder: varType === 'request' ? 'Value' : 'Expr',
      render: ({ value, onChange }) => (
        <MultiLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={onSave}
          onChange={onChange}
          collection={collection}
          placeholder={!value ? (varType === 'request' ? t('COMMON.VALUE') : t('COLLECTION_SETTINGS.EXPR')) : ''}
        />
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
        tableId="collection-vars"
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
