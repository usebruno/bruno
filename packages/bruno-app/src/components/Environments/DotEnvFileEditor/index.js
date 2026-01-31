import React, { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import { TableVirtuoso } from 'react-virtuoso';
import { IconTrash, IconAlertCircle, IconFileOff } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import MultiLineEditor from 'components/MultiLineEditor/index';
import CodeEditor from 'components/CodeEditor';
import StyledWrapper from './StyledWrapper';
import { uuid } from 'utils/common';
import { useFormik } from 'formik';
import { variableNameRegex } from 'utils/common/regex';
import toast from 'react-hot-toast';
import { Tooltip } from 'react-tooltip';

const TableRow = React.memo(({ children, item }) => (
  <tr key={item.uid} data-testid={`dotenv-var-row-${item.name}`}>{children}</tr>
), (prevProps, nextProps) => {
  const prevUid = prevProps?.item?.uid;
  const nextUid = nextProps?.item?.uid;
  return prevUid === nextUid && prevProps.children === nextProps.children;
});

const ErrorMessage = React.memo(({ formik, name, index }) => {
  const meta = formik.getFieldMeta(name);
  const id = `error-${name}-${index}`;

  const isLastRow = index === formik.values.length - 1;
  const variable = formik.values[index];
  const isEmptyRow = !variable?.name || variable.name.trim() === '';

  if ((isLastRow && isEmptyRow) || !meta.error || !meta.touched) {
    return null;
  }

  return (
    <span>
      <IconAlertCircle id={id} className="text-red-600 cursor-pointer" size={20} />
      <Tooltip className="tooltip-mod" anchorId={id} html={meta.error || ''} />
    </span>
  );
});

const MIN_H = 35 * 2;

const variablesToRaw = (variables) => {
  return variables
    .filter((v) => v.name && v.name.trim() !== '')
    .map((v) => {
      const value = v.value || '';
      if (value.includes('\n') || value.includes('"') || value.includes('\'')) {
        const escapedValue = value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n');
        return `${v.name}="${escapedValue}"`;
      }
      return `${v.name}=${value}`;
    })
    .join('\n');
};

const rawToVariables = (rawContent) => {
  if (!rawContent || rawContent.trim() === '') {
    return [];
  }

  const variables = [];
  const lines = rawContent.split('\n');

  for (const line of lines) {
    const trimmedLine = line.trim();

    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const equalIndex = trimmedLine.indexOf('=');
    if (equalIndex === -1) {
      continue;
    }

    const name = trimmedLine.substring(0, equalIndex).trim();
    let value = trimmedLine.substring(equalIndex + 1);

    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith('\'') && value.endsWith('\''))) {
      value = value.slice(1, -1);
      value = value.replace(/\\n/g, '\n').replace(/\\"/g, '"').replace(/\\\\/g, '\\');
    }

    if (name) {
      variables.push({
        uid: uuid(),
        name,
        value,
        enabled: true,
        secret: false
      });
    }
  }

  return variables;
};

const DotEnvFileEditor = ({
  variables,
  onSave,
  onSaveRaw,
  isModified,
  setIsModified,
  dotEnvExists,
  rawContent,
  viewMode = 'table',
  collection,
  item
}) => {
  const { storedTheme } = useTheme();
  const [tableHeight, setTableHeight] = useState(MIN_H);
  const initialRawValue = rawContent !== undefined ? rawContent : variablesToRaw(variables || []);
  const [rawValue, setRawValue] = useState(initialRawValue);
  const [prevViewMode, setPrevViewMode] = useState(viewMode);
  const [isSaving, setIsSaving] = useState(false);

  const formikRef = useRef(null);

  const handleTotalHeightChanged = useCallback((h) => {
    setTableHeight(h);
  }, []);

  const initialValues = useMemo(() => {
    const vars = variables || [];
    return [
      ...vars,
      {
        uid: uuid(),
        name: '',
        value: ''
      }
    ];
  }, [variables]);

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: initialValues,
    validate: (values) => {
      const errors = {};
      values.forEach((variable, index) => {
        const isLastRow = index === values.length - 1;
        const isEmptyRow = !variable.name || variable.name.trim() === '';

        if (isLastRow && isEmptyRow) {
          return;
        }

        if (!variable.name || variable.name.trim() === '') {
          if (!errors[index]) errors[index] = {};
          errors[index].name = 'Name cannot be empty';
        } else if (!variableNameRegex.test(variable.name)) {
          if (!errors[index]) errors[index] = {};
          errors[index].name
            = 'Name contains invalid characters. Must only contain alphanumeric characters, "-", "_", "." and cannot start with a digit.';
        }
      });
      return Object.keys(errors).length > 0 ? errors : {};
    },
    onSubmit: () => {}
  });

  formikRef.current = formik;

  useEffect(() => {
    if (rawContent !== undefined) {
      setRawValue(rawContent);
    } else {
      setRawValue(variablesToRaw(variables || []));
    }
  }, [rawContent, variables]);

  useEffect(() => {
    if (viewMode !== prevViewMode) {
      if (viewMode === 'raw' && prevViewMode === 'table') {
        const currentVars = formikRef.current.values.filter((v) => v.name && v.name.trim() !== '');
        const newRawValue = variablesToRaw(currentVars);
        setRawValue(newRawValue);
      } else if (viewMode === 'table' && prevViewMode === 'raw') {
        const parsedVars = rawToVariables(rawValue);
        const newValues = [
          ...parsedVars,
          {
            uid: uuid(),
            name: '',
            value: ''
          }
        ];
        formikRef.current.setValues(newValues);
      }
      setPrevViewMode(viewMode);
    }
  }, [viewMode, prevViewMode, rawValue]);

  const savedValuesJson = useMemo(() => {
    return JSON.stringify(variables || []);
  }, [variables]);

  useEffect(() => {
    if (viewMode === 'raw') {
      const hasRawChanges = rawValue !== (rawContent || '');
      setIsModified(hasRawChanges);
    } else {
      const currentValues = formik.values.filter((variable) => variable.name && variable.name.trim() !== '');
      const currentValuesJson = JSON.stringify(currentValues);
      const hasActualChanges = currentValuesJson !== savedValuesJson;
      setIsModified(hasActualChanges);
    }
  }, [formik.values, savedValuesJson, setIsModified, viewMode, rawValue, rawContent]);

  const valuesRef = useRef(formik.values);
  valuesRef.current = formik.values;

  const handleRemoveVar = useCallback((id) => {
    const currentValues = valuesRef.current;

    if (!currentValues || currentValues.length === 0) {
      return;
    }

    const lastRow = currentValues[currentValues.length - 1];
    const isLastEmptyRow = lastRow?.uid === id && (!lastRow.name || lastRow.name.trim() === '');

    if (isLastEmptyRow) {
      return;
    }

    const filteredValues = currentValues.filter((variable) => variable.uid !== id);

    const hasEmptyLastRow
      = filteredValues.length > 0
        && (!filteredValues[filteredValues.length - 1].name
          || filteredValues[filteredValues.length - 1].name.trim() === '');

    const newValues = hasEmptyLastRow
      ? filteredValues
      : [
          ...filteredValues,
          {
            uid: uuid(),
            name: '',
            value: ''
          }
        ];

    formik.setValues(newValues);
  }, []);

  const handleNameChange = (index, e) => {
    formik.handleChange(e);
    const isLastRow = index === valuesRef.current.length - 1;

    if (isLastRow) {
      const newVariable = { uid: uuid(), name: '', value: '' };
      setTimeout(() => {
        formik.setValues((prev) => {
          const lastRow = prev[prev.length - 1];
          if (lastRow?.name?.trim()) {
            return [...prev, newVariable];
          }
          return prev;
        });
      }, 0);
    }
  };

  const handleNameBlur = (index) => {
    formik.setFieldTouched(`${index}.name`, true, true);
  };

  const handleNameKeyDown = (index, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      formik.setFieldTouched(`${index}.name`, true, true);
    }
  };

  const handleSave = () => {
    if (isSaving) return;

    const variablesToSave = formik.values.filter((variable) => variable.name && variable.name.trim() !== '');

    const hasValidationErrors = variablesToSave.some((variable) => {
      if (!variable.name || variable.name.trim() === '') {
        return true;
      }
      if (!variableNameRegex.test(variable.name)) {
        return true;
      }
      return false;
    });

    if (hasValidationErrors) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    setIsSaving(true);
    onSave(variablesToSave)
      .then(() => {
        toast.success('Changes saved successfully');
        const newValues = [
          ...variablesToSave,
          {
            uid: uuid(),
            name: '',
            value: ''
          }
        ];
        formik.resetForm({ values: newValues });
        setIsModified(false);
      })
      .catch((error) => {
        console.error(error);
        toast.error('An error occurred while saving the changes');
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleSaveRaw = () => {
    if (isSaving) return;

    if (!onSaveRaw) {
      toast.error('Raw save is not supported');
      return;
    }

    setIsSaving(true);
    onSaveRaw(rawValue)
      .then(() => {
        toast.success('Changes saved successfully');
        setIsModified(false);
      })
      .catch((error) => {
        console.error(error);
        toast.error('An error occurred while saving the changes');
      })
      .finally(() => {
        setIsSaving(false);
      });
  };

  const handleReset = () => {
    if (viewMode === 'raw') {
      setRawValue(rawContent || '');
      setIsModified(false);
    } else {
      const originalVars = variables || [];
      const resetValues = [
        ...originalVars,
        {
          uid: uuid(),
          name: '',
          value: ''
        }
      ];
      formik.resetForm({ values: resetValues });
      setIsModified(false);
    }
  };

  const handleRawChange = (newValue) => {
    setRawValue(newValue);
  };

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const handleSaveRawRef = useRef(handleSaveRaw);
  handleSaveRawRef.current = handleSaveRaw;

  useEffect(() => {
    const handleSaveEvent = () => {
      if (viewMode === 'raw') {
        handleSaveRawRef.current();
      } else {
        handleSaveRef.current();
      }
    };

    window.addEventListener('dotenv-save', handleSaveEvent);

    return () => {
      window.removeEventListener('dotenv-save', handleSaveEvent);
    };
  }, [viewMode]);

  if (viewMode === 'raw') {
    return (
      <StyledWrapper>
        <div className="raw-editor-container">
          <CodeEditor
            collection={collection}
            item={item}
            theme={storedTheme}
            value={rawValue}
            onEdit={handleRawChange}
            onSave={handleSaveRaw}
            mode="text/plain"
            enableVariableHighlighting={false}
            enableBrunoVarInfo={false}
          />
        </div>
        <div className="button-container">
          <div className="flex items-center">
            <button type="button" className="submit" onClick={handleSaveRaw} disabled={isSaving} data-testid="save-dotenv-raw">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" className="submit reset ml-2" onClick={handleReset} disabled={isSaving} data-testid="reset-dotenv-raw">
              Reset
            </button>
          </div>
        </div>
      </StyledWrapper>
    );
  }

  if (!dotEnvExists && (!variables || variables.length === 0)) {
    return (
      <StyledWrapper>
        <div className="empty-state">
          <IconFileOff size={48} strokeWidth={1.5} />
          <div className="title">No .env File</div>
          <div className="description">
            Add a variable below to create a .env file in this location.
          </div>
        </div>
        <TableVirtuoso
          className="table-container"
          style={{ height: MIN_H }}
          components={{ TableRow }}
          data={formik.values}
          totalListHeightChanged={handleTotalHeightChanged}
          fixedHeaderContent={() => (
            <tr>
              <td>Name</td>
              <td className="delete-col"></td>
            </tr>
          )}
          fixedItemHeight={35}
          computeItemKey={(index, variable) => variable.uid}
          itemContent={(index, variable) => {
            const isLastRow = index === formik.values.length - 1;
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
                      onChange={(e) => handleNameChange(index, e)}
                      onBlur={() => handleNameBlur(index)}
                      onKeyDown={(e) => handleNameKeyDown(index, e)}
                    />
                    <ErrorMessage formik={formik} name={`${index}.name`} index={index} />
                  </div>
                </td>
                <td className="delete-col">
                  {!isLastEmptyRow && (
                    <button type="button" onClick={() => handleRemoveVar(variable.uid)}>
                      <IconTrash strokeWidth={1.5} size={18} />
                    </button>
                  )}
                </td>
              </>
            );
          }}
        />
        <div className="button-container">
          <div className="flex items-center">
            <button type="button" className="submit" onClick={handleSave} disabled={isSaving} data-testid="save-dotenv">
              {isSaving ? 'Saving...' : 'Save'}
            </button>
            <button type="button" className="submit reset ml-2" onClick={handleReset} disabled={isSaving} data-testid="reset-dotenv">
              Reset
            </button>
          </div>
        </div>
      </StyledWrapper>
    );
  }

  return (
    <StyledWrapper>
      <TableVirtuoso
        className="table-container"
        style={{ height: tableHeight }}
        components={{ TableRow }}
        data={formik.values}
        totalListHeightChanged={handleTotalHeightChanged}
        fixedHeaderContent={() => (
          <tr>
            <td>Name</td>
            <td>Value</td>
            <td className="delete-col"></td>
          </tr>
        )}
        fixedItemHeight={35}
        computeItemKey={(index, variable) => variable.uid}
        itemContent={(index, variable) => {
          const isLastRow = index === formik.values.length - 1;
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
                    onChange={(e) => handleNameChange(index, e)}
                    onBlur={() => handleNameBlur(index)}
                    onKeyDown={(e) => handleNameKeyDown(index, e)}
                  />
                  <ErrorMessage formik={formik} name={`${index}.name`} index={index} />
                </div>
              </td>
              <td className="flex flex-row flex-nowrap items-center">
                <div className="overflow-hidden grow w-full relative">
                  <MultiLineEditor
                    theme={storedTheme}
                    name={`${index}.value`}
                    value={variable.value}
                    placeholder={isLastEmptyRow ? 'Value' : ''}
                    onChange={(newValue) => formik.setFieldValue(`${index}.value`, newValue, true)}
                    onSave={handleSave}
                  />
                </div>
              </td>
              <td className="delete-col">
                {!isLastEmptyRow && (
                  <button type="button" onClick={() => handleRemoveVar(variable.uid)}>
                    <IconTrash strokeWidth={1.5} size={18} />
                  </button>
                )}
              </td>
            </>
          );
        }}
      />

      <div className="button-container">
        <div className="flex items-center">
          <button type="button" className="submit" onClick={handleSave} data-testid="save-dotenv">
            Save
          </button>
          <button type="button" className="submit reset ml-2" onClick={handleReset} data-testid="reset-dotenv">
            Reset
          </button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default DotEnvFileEditor;
