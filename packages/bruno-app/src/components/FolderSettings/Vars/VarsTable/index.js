import React, { useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { useTheme } from 'providers/Theme';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import { updateTableColumnWidths } from 'providers/ReduxStore/slices/tabs';
import MultiLineEditor from 'components/MultiLineEditor';
import InfoTip from 'components/InfoTip';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { variableNameRegex } from 'utils/common/regex';
import { setFolderVars } from 'providers/ReduxStore/slices/collections/index';

const VarsTable = ({ folder, collection, vars, varType, initialScroll = 0 }) => {
  const { t } = useTranslation();
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
      name: t('COMMON.NAME'),
      isKeyField: true,
      placeholder: t('COMMON.NAME'),
      width: '40%'
    },
    {
      key: 'value',
      name: varType === 'request' ? t('COMMON.VALUE') : (
        <div className="flex items-center">
          <span>{t('REQUEST_PANE.EXPR')}</span>
          <InfoTip content={t('REQUEST_PANE.YOU_CAN_WRITE_ANY_VALID_JS_EXPRESSION_HERE')} infotipId={`folder-${varType}-var`} />
        </div>
      ),
      placeholder: varType === 'request' ? t('COMMON.VALUE') : t('REQUEST_PANE.EXPR'),
      render: ({ value, onChange }) => (
        <MultiLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={onSave}
          onChange={onChange}
          collection={collection}
          item={folder}
          placeholder={!value ? (varType === 'request' ? t('COMMON.VALUE') : t('REQUEST_PANE.EXPR')) : ''}
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
        tableId="folder-vars"
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
