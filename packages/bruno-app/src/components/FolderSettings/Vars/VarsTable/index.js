import React, { useState, useCallback } from 'react';
import { useDispatch } from 'react-redux';
import { useTheme } from 'providers/Theme';
import { saveFolderRoot } from 'providers/ReduxStore/slices/collections/actions';
import MultiLineEditor from 'components/MultiLineEditor';
import InfoTip from 'components/InfoTip';
import EditableTable from 'components/EditableTable';
import StyledWrapper from './StyledWrapper';
import toast from 'react-hot-toast';
import { variableNameRegex } from 'utils/common/regex';
import { setFolderVars } from 'providers/ReduxStore/slices/collections/index';

const VarsTable = ({ folder, collection, vars, varType }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const [showDescriptionColumn, setShowDescriptionColumn] = useState(false);

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

  const descriptionColumn = {
    key: 'description',
    name: 'Description',
    placeholder: 'Description',
    width: '25%',
    render: ({ value, onChange }) => (
      <MultiLineEditor
        value={value || ''}
        theme={storedTheme}
        onSave={onSave}
        onChange={onChange}
        allowNewlines={true}
        collection={collection}
        item={folder}
        placeholder={!value ? 'Description' : ''}
      />
    )
  };

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
      render: ({ value, onChange }) => (
        <MultiLineEditor
          value={value || ''}
          theme={storedTheme}
          onSave={onSave}
          onChange={onChange}
          collection={collection}
          item={folder}
          placeholder={!value ? (varType === 'request' ? 'Value' : 'Expr') : ''}
        />
      )
    },
    ...(showDescriptionColumn ? [descriptionColumn] : [])
  ];

  const defaultRow = {
    name: '',
    value: '',
    description: '',
    ...(varType === 'response' ? { local: false } : {})
  };

  return (
    <StyledWrapper className="w-full">
      <div className="flex justify-end mt-2 mb-2">
        <button
          type="button"
          className="btn-action text-link select-none"
          onClick={() => setShowDescriptionColumn((v) => !v)}
        >
          {showDescriptionColumn ? 'Hide Description' : 'Description'}
        </button>
      </div>
      <EditableTable
        columns={columns}
        rows={vars}
        onChange={handleVarsChange}
        defaultRow={defaultRow}
        getRowError={getRowError}
      />
    </StyledWrapper>
  );
};

export default VarsTable;
