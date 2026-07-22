import React, { useCallback, useRef } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { IconTrash } from '@tabler/icons';
import MultiLineEditor from 'components/MultiLineEditor/index';
import DotEnvErrorMessage from './DotEnvErrorMessage';
import { MIN_TABLE_HEIGHT } from './utils';

const TableRow = React.memo(({ children, item }) => (
  <tr key={item.uid} data-testid={`dotenv-var-row-${item.name}`}>{children}</tr>
), (prevProps, nextProps) => {
  const prevUid = prevProps?.item?.uid;
  const nextUid = nextProps?.item?.uid;
  return prevUid === nextUid && prevProps.children === nextProps.children;
});

const DotEnvTableView = ({
  formik,
  theme,
  showValueColumn,
  tableHeight,
  onHeightChange,
  onNameChange,
  onNameBlur,
  onNameKeyDown,
  onRemoveVar,
  onSave,
  onReset,
  isSaving
}) => {
  const handleTotalHeightChanged = useCallback((h) => {
    onHeightChange(h);
  }, [onHeightChange]);

  // Use refs for stable access to formik values in callbacks
  const formikRef = useRef(formik);
  formikRef.current = formik;

  // Don't memoize itemContent - TableVirtuoso handles this internally
  // and we need fresh access to formik values
  const itemContent = (index, variable) => {
    const currentFormik = formikRef.current;
    const isLastRow = index === currentFormik.values.length - 1;
    const isEmptyRow = !variable.name || variable.name.trim() === '';
    const isLastEmptyRow = isLastRow && isEmptyRow;

    return (
      <>
        <td>
          <div className="flex items-center">
            <input
              type="text"
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              className="mousetrap"
              id={`${index}.name`}
              name={`${index}.name`}
              value={variable.name}
              placeholder={isLastEmptyRow ? 'Name' : ''}
              onChange={(e) => onNameChange(index, e)}
              onBlur={() => onNameBlur(index)}
              onKeyDown={(e) => onNameKeyDown(index, e)}
            />
            <DotEnvErrorMessage formik={currentFormik} name={`${index}.name`} index={index} />
          </div>
        </td>
        {showValueColumn && (
          <td className="flex flex-row flex-nowrap items-center">
            <div className="overflow-hidden grow w-full relative">
              <MultiLineEditor
                theme={theme}
                name={`${index}.value`}
                value={variable.value}
                placeholder={isLastEmptyRow ? 'Value' : ''}
                onChange={(newValue) => currentFormik.setFieldValue(`${index}.value`, newValue, true)}
                onSave={onSave}
              />
            </div>
          </td>
        )}
        <td className="delete-col">
          {!isLastEmptyRow && (
            <button
              type="button"
              aria-label="Delete variable"
              onClick={() => onRemoveVar(variable.uid)}
            >
              <IconTrash strokeWidth={1.5} size={18} />
            </button>
          )}
        </td>
      </>
    );
  };

  return (
    <>
      <TableVirtuoso
        className="table-container"
        style={{ height: tableHeight || MIN_TABLE_HEIGHT }}
        components={{ TableRow }}
        data={formik.values}
        totalListHeightChanged={handleTotalHeightChanged}
        fixedHeaderContent={() => (
          <tr>
            <td>Name</td>
            {showValueColumn && <td>Value</td>}
            <td className="delete-col"></td>
          </tr>
        )}
        fixedItemHeight={35}
        computeItemKey={(index, variable) => variable.uid}
        itemContent={itemContent}
      />
      <div className="button-container">
        <div className="flex items-center">
          <button type="button" className="submit" onClick={onSave} disabled={isSaving} data-testid="save-dotenv">
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button type="button" className="submit reset ml-2" onClick={onReset} disabled={isSaving} data-testid="reset-dotenv">
            Reset
          </button>
        </div>
      </div>
    </>
  );
};

export default DotEnvTableView;
