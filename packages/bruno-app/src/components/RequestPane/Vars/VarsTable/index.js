import React, { useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { moveVar, setRequestVars } from 'providers/ReduxStore/slices/collections';
import { sendRequest, saveRequest } from 'providers/ReduxStore/slices/collections/actions';
import MultiLineEditor from 'components/MultiLineEditor';
import InfoTip from 'components/InfoTip';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { variableNameRegex } from 'utils/common/regex';

const VarsTable = ({ item, collection, vars, varType }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();

  const onSave = () => dispatch(saveRequest(item.uid, collection.uid));
  const handleRun = () => dispatch(sendRequest(item, collection.uid));

  const handleVarsChange = useCallback((updatedVars) => {
    dispatch(setRequestVars({
      collectionUid: collection.uid,
      itemUid: item.uid,
      vars: updatedVars,
      type: varType
    }));
  }, [dispatch, collection.uid, item.uid, varType]);

  const handleVarDrag = useCallback(({ updateReorderedItem }) => {
    dispatch(moveVar({
      type: varType,
      collectionUid: collection.uid,
      itemUid: item.uid,
      updateReorderedItem
    }));
  }, [dispatch, varType, collection.uid, item.uid]);

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
      width: '35%'
    },
    {
      key: 'value',
      name: varType === 'request' ? 'Value' : (
        <div className="flex items-center">
          <span>Expr</span>
          <InfoTip content="You can write any valid JS expression here" infotipId={`request-${varType}-var`} />
        </div>
      ),
      placeholder: varType === 'request' ? 'Value' : 'Expr',
      render: ({ value, onChange }) => (
        <MultiLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={onSave}
          onChange={onChange}
          onRun={handleRun}
          collection={collection}
          item={item}
          placeholder={!value ? (varType === 'request' ? 'Value' : 'Expr') : ''}
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
        columns={columns}
        rows={vars || []}
        onChange={handleVarsChange}
        defaultRow={defaultRow}
        getRowError={getRowError}
        reorderable={true}
        onReorder={handleVarDrag}
      />
    </StyledWrapper>
  );
};

export default VarsTable;
