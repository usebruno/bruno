import React, { useRef, useMemo } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { IconTrash } from '@tabler/icons';
import MultiLineEditor from 'components/MultiLineEditor/index';
import DotEnvErrorMessage from './DotEnvErrorMessage';

const TableRowInner = React.forwardRef(({ children, item, ...rest }, ref) => (
  <tr ref={ref} {...rest} data-testid={`dotenv-var-row-${item.name}`}>
    {children}
  </tr>
));
TableRowInner.displayName = 'DotEnvTableRowInner';

const TableRow = React.memo(TableRowInner);

const DotEnvTableView = ({
  formik,
  theme,
  showValueColumn,
  onNameChange,
  onNameBlur,
  onNameKeyDown,
  onRemoveVar,
  onSave,
  onReset,
  isSaving
}) => {
  // Use refs for stable access to formik values in callbacks
  const formikRef = useRef(formik);
  formikRef.current = formik;

  const fillerColSpan = showValueColumn ? 3 : 2;
  const tableComponents = useMemo(
    () => ({
      TableRow,
      FillerRow: ({ height }) => (
        <tr aria-hidden="true">
          <td
            colSpan={fillerColSpan}
            style={{
              height,
              padding: 0,
              border: 0,
              verticalAlign: 'top',
              lineHeight: 0
            }}
          />
        </tr>
      )
    }),
    [fillerColSpan]
  );

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
          <td>
            <div className="flex flex-row flex-nowrap items-start gap-1 min-w-0 w-full">
              <div className="overflow-hidden min-w-0 min-h-0 flex-1 self-start relative w-full">
                <MultiLineEditor
                  theme={theme}
                  name={`${index}.value`}
                  value={variable.value}
                  placeholder={isLastEmptyRow ? 'Value' : ''}
                  onChange={(newValue) => currentFormik.setFieldValue(`${index}.value`, newValue, true)}
                  onSave={onSave}
                />
              </div>
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
      <div className="table-scroll-area">
        <TableVirtuoso
          className="table-container"
          components={tableComponents}
          data={formik.values}
          increaseViewportBy={200}
          fixedHeaderContent={() => (
            <tr>
              <td>Name</td>
              {showValueColumn && <td>Value</td>}
              <td className="delete-col"></td>
            </tr>
          )}
          defaultItemHeight={35}
          computeItemKey={(index, variable) => variable.uid}
          itemContent={itemContent}
        />
      </div>
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
