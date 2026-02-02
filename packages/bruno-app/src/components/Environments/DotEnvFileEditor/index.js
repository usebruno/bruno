import React, { useCallback, useRef, useMemo, useEffect, useState } from 'react';
import { useTheme } from 'providers/Theme';
import { uuid } from 'utils/common';
import { useFormik } from 'formik';
import { variableNameRegex } from 'utils/common/regex';
import toast from 'react-hot-toast';

import StyledWrapper from './StyledWrapper';
import DotEnvTableView from './DotEnvTableView';
import DotEnvRawView from './DotEnvRawView';
import DotEnvEmptyState from './DotEnvEmptyState';
import { variablesToRaw, rawToVariables, MIN_TABLE_HEIGHT } from './utils';

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
  const { displayedTheme } = useTheme();
  const [tableHeight, setTableHeight] = useState(MIN_TABLE_HEIGHT);
  // Derive a single baseline raw value for consistent dirty-tracking
  const baselineRaw = rawContent ?? variablesToRaw(variables || []);
  const initialRawValue = baselineRaw;
  const [rawValue, setRawValue] = useState(initialRawValue);
  const [prevViewMode, setPrevViewMode] = useState(viewMode);
  const [isSaving, setIsSaving] = useState(false);

  const formikRef = useRef(null);

  const initialValues = useMemo(() => {
    const vars = (variables || []).map((v) => ({
      ...v,
      uid: v.uid || uuid()
    }));
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

  // Sync raw value with external changes
  useEffect(() => {
    setRawValue(baselineRaw);
  }, [baselineRaw]);

  // Handle view mode switching
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
          { uid: uuid(), name: '', value: '' }
        ];
        formikRef.current.setValues(newValues);
      }
      setPrevViewMode(viewMode);
    }
  }, [viewMode, prevViewMode, rawValue]);

  const normalizeForComparison = (vars) => {
    return vars
      .filter((v) => v.name && v.name.trim() !== '')
      .map(({ name, value }) => ({ name, value: value || '' }));
  };

  const savedValuesJson = useMemo(() => {
    return JSON.stringify(normalizeForComparison(variables || []));
  }, [variables]);

  useEffect(() => {
    if (viewMode === 'raw') {
      const hasRawChanges = rawValue !== baselineRaw;
      setIsModified(hasRawChanges);
    } else {
      const currentValuesJson = JSON.stringify(normalizeForComparison(formik.values));
      const hasActualChanges = currentValuesJson !== savedValuesJson;
      setIsModified(hasActualChanges);
    }
  }, [formik.values, savedValuesJson, setIsModified, viewMode, rawValue, baselineRaw]);

  // Ref for stable formik.values access
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
          { uid: uuid(), name: '', value: '' }
        ];

    formikRef.current.setValues(newValues);
  }, []);

  const handleNameChange = useCallback((index, e) => {
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
  }, []);

  const handleNameBlur = useCallback((index) => {
    formik.setFieldTouched(`${index}.name`, true, true);
  }, []);

  const handleNameKeyDown = useCallback((index, e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      formik.setFieldTouched(`${index}.name`, true, true);
    }
  }, []);

  const handleSave = useCallback(() => {
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
          { uid: uuid(), name: '', value: '' }
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
  }, [isSaving, formik.values, onSave, setIsModified]);

  const handleSaveRaw = useCallback(() => {
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
  }, [isSaving, rawValue, onSaveRaw, setIsModified]);

  const handleReset = useCallback(() => {
    if (viewMode === 'raw') {
      setRawValue(baselineRaw);
      setIsModified(false);
    } else {
      const originalVars = (variables || []).map((v) => ({
        ...v,
        uid: v.uid || uuid()
      }));
      const resetValues = [
        ...originalVars,
        { uid: uuid(), name: '', value: '' }
      ];
      formik.resetForm({ values: resetValues });
      setIsModified(false);
    }
  }, [viewMode, baselineRaw, variables, setIsModified]);

  const handleRawChange = useCallback((newValue) => {
    setRawValue(newValue);
  }, []);

  // Global save event listener
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

  // Raw view mode
  if (viewMode === 'raw') {
    return (
      <StyledWrapper>
        <DotEnvRawView
          collection={collection}
          item={item}
          theme={displayedTheme}
          value={rawValue}
          onChange={handleRawChange}
          onSave={handleSaveRaw}
          onReset={handleReset}
          isSaving={isSaving}
        />
      </StyledWrapper>
    );
  }

  // Empty state (no .env file exists yet)
  const showEmptyState = !dotEnvExists && (!variables || variables.length === 0);

  return (
    <StyledWrapper>
      {showEmptyState && <DotEnvEmptyState />}
      <DotEnvTableView
        formik={formik}
        theme={displayedTheme}
        showValueColumn={!showEmptyState}
        tableHeight={showEmptyState ? MIN_TABLE_HEIGHT : tableHeight}
        onHeightChange={setTableHeight}
        onNameChange={handleNameChange}
        onNameBlur={handleNameBlur}
        onNameKeyDown={handleNameKeyDown}
        onRemoveVar={handleRemoveVar}
        onSave={handleSave}
        onReset={handleReset}
        isSaving={isSaving}
      />
    </StyledWrapper>
  );
};

export default DotEnvFileEditor;
