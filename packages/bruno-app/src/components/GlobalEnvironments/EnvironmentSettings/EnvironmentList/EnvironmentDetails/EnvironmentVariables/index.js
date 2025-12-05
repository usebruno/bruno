import React, { useRef, useEffect, useMemo, useState } from 'react';
import cloneDeep from 'lodash/cloneDeep';
import { IconTrash, IconAlertCircle, IconInfoCircle } from '@tabler/icons';
import { useTheme } from 'providers/Theme';
import { useDispatch, useSelector } from 'react-redux';
import MultiLineEditor from 'components/MultiLineEditor/index';
import StyledWrapper from './StyledWrapper';
import { uuid } from 'utils/common';
import { useFormik } from 'formik';
import * as Yup from 'yup';
import { variableNameRegex } from 'utils/common/regex';
import toast from 'react-hot-toast';
import { saveGlobalEnvironment } from 'providers/ReduxStore/slices/global-environments';
import { Tooltip } from 'react-tooltip';
import { getGlobalEnvironmentVariables } from 'utils/collections';

// Autocomplete input component for variable names
const AutocompleteInput = ({ value, onChange, suggestions, id, name, className }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const inputRef = useRef(null);

  const handleInputChange = (e) => {
    const inputValue = e.target.value;
    onChange(e);

    if (inputValue.trim()) {
      const filtered = suggestions.filter((suggestion) =>
        suggestion.toLowerCase().includes(inputValue.toLowerCase()) && suggestion.toLowerCase() !== inputValue.toLowerCase()
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
      setSelectedIndex(-1);
    } else {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions || filteredSuggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex((prev) => (prev < filteredSuggestions.length - 1 ? prev + 1 : prev));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : -1));
        break;
      case 'Enter':
        e.preventDefault();
        if (selectedIndex >= 0 && selectedIndex < filteredSuggestions.length) {
          selectSuggestion(filteredSuggestions[selectedIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setSelectedIndex(-1);
        break;
      default:
        break;
    }
  };

  const selectSuggestion = (suggestion) => {
    const syntheticEvent = {
      target: {
        name: name,
        value: suggestion
      }
    };
    onChange(syntheticEvent);
    setShowSuggestions(false);
    setSelectedIndex(-1);
  };

  const handleBlur = () => {
    setTimeout(() => {
      setShowSuggestions(false);
      setSelectedIndex(-1);
    }, 150);
  };

  const handleFocus = () => {
    if (value && value.trim()) {
      const filtered = suggestions.filter((suggestion) =>
        suggestion.toLowerCase().includes(value.toLowerCase()) && suggestion.toLowerCase() !== value.toLowerCase()
      );
      if (filtered.length > 0) {
        setFilteredSuggestions(filtered);
        setShowSuggestions(true);
      }
    }
  };

  return (
    <div className="autocomplete-wrapper">
      <input
        ref={inputRef}
        type="text"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck="false"
        className={className}
        id={id}
        name={name}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        onFocus={handleFocus}
      />
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          ref={suggestionsRef}
          className="autocomplete-suggestions"
          onMouseDown={(e) => e.preventDefault()}
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={suggestion}
              className={`suggestion-item ${index === selectedIndex ? 'selected' : ''}`}
              onClick={() => selectSuggestion(suggestion)}
              onMouseDown={(e) => e.preventDefault()}
            >
              {suggestion}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Wrapper component for MultiLineEditor with value suggestions from other environments
const MultiLineEditorWithSuggestions = ({ suggestions, onChange, children, ...props }) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const wrapperRef = useRef(null);

  const filteredSuggestions = suggestions.filter(
    (suggestion) => suggestion.value !== props.value && suggestion.value && suggestion.value.trim()
  );

  const hasSuggestions = filteredSuggestions.length > 0;
  const buttonRef = useRef(null);

  const handleClickCapture = (e) => {
    if (buttonRef.current && buttonRef.current.contains(e.target)) {
      return;
    }
    if (hasSuggestions && !showSuggestions) {
      setShowSuggestions(true);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
        setShowSuggestions(false);
      }
    };

    if (showSuggestions) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showSuggestions]);

  const selectSuggestion = (suggestion) => {
    onChange(suggestion.value);
    setShowSuggestions(false);

    if (wrapperRef.current) {
      const cmElement = wrapperRef.current.querySelector('.CodeMirror');
      if (cmElement && cmElement.CodeMirror) {
        cmElement.CodeMirror.getInputField().blur();
      }
    }
  };

  const toggleSuggestions = (e) => {
    e.stopPropagation();
    setShowSuggestions(!showSuggestions);
  };

  return (
    <div
      ref={wrapperRef}
      className="value-autocomplete-wrapper"
      onClickCapture={handleClickCapture}
    >
      {children}
      {hasSuggestions && (
        <button
          ref={buttonRef}
          type="button"
          className="suggestions-toggle-btn"
          onClick={toggleSuggestions}
          title="Show values from other environments"
        >
          ▼
        </button>
      )}
      {showSuggestions && filteredSuggestions.length > 0 && (
        <div
          className="value-autocomplete-suggestions"
          onMouseDown={(e) => e.preventDefault()}
        >
          {filteredSuggestions.map((suggestion, index) => (
            <div
              key={`${suggestion.envName}-${index}`}
              className="suggestion-item"
              onClick={(e) => {
                e.stopPropagation();
                selectSuggestion(suggestion);
              }}
              onMouseDown={(e) => e.preventDefault()}
            >
              <span className="suggestion-env-name">{suggestion.envName}</span>
              <span className="suggestion-value">{suggestion.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const EnvironmentVariables = ({ environment, setIsModified, originalEnvironmentVariables, collection }) => {
  const dispatch = useDispatch();
  const { storedTheme } = useTheme();
  const addButtonRef = useRef(null);
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);

  let _collection = cloneDeep(collection);

  const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
  _collection.globalEnvironmentVariables = globalEnvironmentVariables;

  // Collect all unique variable names from other global environments for autocomplete suggestions
  const allEnvVariableNames = useMemo(() => {
    const nameSet = new Set();
    if (globalEnvironments) {
      globalEnvironments.forEach((env) => {
        if (env.uid !== environment.uid && env.variables) {
          env.variables.forEach((variable) => {
            if (variable.name && variable.name.trim()) {
              nameSet.add(variable.name);
            }
          });
        }
      });
    }
    return Array.from(nameSet).sort();
  }, [globalEnvironments, environment.uid]);

  // Function to get values from other global environments for a given variable name
  const getValueSuggestionsForName = (variableName) => {
    if (!variableName || !variableName.trim() || !globalEnvironments) {
      return [];
    }
    const suggestions = [];
    globalEnvironments.forEach((env) => {
      if (env.uid !== environment.uid && env.variables) {
        const matchingVar = env.variables.find((v) => v.name === variableName);
        if (matchingVar && matchingVar.value) {
          suggestions.push({
            envName: env.name,
            value: matchingVar.value
          });
        }
      }
    });
    return suggestions;
  };

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: environment.variables || [],
    validationSchema: Yup.array().of(
      Yup.object({
        enabled: Yup.boolean(),
        name: Yup.string()
          .required('Name cannot be empty')
          .matches(
            variableNameRegex,
            'Name contains invalid characters. Must only contain alphanumeric characters, "-", "_", "." and cannot start with a digit.'
          )
          .trim(),
        secret: Yup.boolean(),
        type: Yup.string(),
        uid: Yup.string(),
        value: Yup.mixed().nullable()
      })
    ),
    onSubmit: (values) => {
      if (!formik.dirty) {
        toast.error('Nothing to save');
        return;
      }

      dispatch(saveGlobalEnvironment({ environmentUid: environment.uid, variables: cloneDeep(values) }))
        .then(() => {
          toast.success('Changes saved successfully');
          formik.resetForm({ values });
          setIsModified(false);
        })
        .catch((error) => {
          console.error(error);
          toast.error('An error occurred while saving the changes');
        });
    }
  });

  // Effect to track modifications.
  React.useEffect(() => {
    setIsModified(formik.dirty);
  }, [formik.dirty]);

  const ErrorMessage = ({ name }) => {
    const meta = formik.getFieldMeta(name);
    const id = uuid();
    if (!meta.error || !meta.touched) {
      return null;
    }
    return (
      <span>
        <IconAlertCircle id={id} className="text-red-600 cursor-pointer" size={20} />
        <Tooltip className="tooltip-mod" anchorId={id} html={meta.error || ''} />
      </span>
    );
  };

  const addVariable = () => {
    const newVariable = {
      uid: uuid(),
      name: '',
      value: '',
      type: 'text',
      secret: false,
      enabled: true
    };
    formik.setFieldValue(formik.values.length, newVariable, false);
  };

  const handleRemoveVar = (id) => {
    formik.setValues(formik.values.filter((variable) => variable.uid !== id));
  };

  useEffect(() => {
    if (formik.dirty) {
      // Smooth scrolling to the changed parameter is temporarily disabled
      // due to UX issues when editing the first row in a long list of environment variables.
      // addButtonRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [formik.values, formik.dirty]);

  const handleReset = () => {
    formik.resetForm({ originalEnvironmentVariables });
  };

  return (
    <StyledWrapper className="w-full mt-6 mb-6">
      <div className="h-[50vh] overflow-y-auto w-full">
        <table>
          <thead>
            <tr>
              <td className="text-center">Enabled</td>
              <td>Name</td>
              <td>Value</td>
              <td className="text-center">Secret</td>
              <td></td>
            </tr>
          </thead>
          <tbody>
            {formik.values.map((variable, index) => (
              <tr key={variable.uid} data-testid={`env-var-row-${variable.name}`}>
                <td className="text-center">
                  <input
                    type="checkbox"
                    className="mousetrap"
                    name={`${index}.enabled`}
                    checked={variable.enabled}
                    onChange={formik.handleChange}
                  />
                </td>
                <td>
                  <div className="flex items-center" data-testid={`env-var-name-${index}`}>
                    <AutocompleteInput
                      className="mousetrap"
                      id={`${index}.name`}
                      name={`${index}.name`}
                      value={variable.name}
                      onChange={formik.handleChange}
                      suggestions={allEnvVariableNames}
                    />
                    <ErrorMessage name={`${index}.name`} />
                  </div>
                </td>
                <td className="flex flex-row flex-nowrap items-center">
                  <div className="grow w-full relative" data-testid={`env-var-value-${index}`}>
                    <MultiLineEditorWithSuggestions
                      suggestions={getValueSuggestionsForName(variable.name)}
                      value={variable.value}
                      onChange={(newValue) => formik.setFieldValue(`${index}.value`, newValue, true)}
                    >
                      <MultiLineEditor
                        theme={storedTheme}
                        collection={_collection}
                        name={`${index}.value`}
                        value={variable.value}
                        isSecret={variable.secret}
                        readOnly={typeof variable.value !== 'string'}
                        onChange={(newValue) => formik.setFieldValue(`${index}.value`, newValue, true)}
                        enableBrunoVarInfo={false}
                      />
                    </MultiLineEditorWithSuggestions>
                  </div>
                  {typeof variable.value !== 'string' && (
                    <span className="ml-2 flex items-center">
                      <IconInfoCircle
                        id={`${variable.name}-disabled-info-icon`}
                        className="text-muted"
                        size={16}
                      />
                      <Tooltip
                        anchorId={`${variable.name}-disabled-info-icon`}
                        content="Non-string values set via scripts are read-only and can only be updated through scripts."
                        place="top"
                      />
                    </span>
                  )}
                </td>
                <td className="text-center">
                  <input
                    type="checkbox"
                    className="mousetrap"
                    name={`${index}.secret`}
                    checked={variable.secret}
                    onChange={formik.handleChange}
                  />
                </td>
                <td>
                  <button onClick={() => handleRemoveVar(variable.uid)}>
                    <IconTrash strokeWidth={1.5} size={20} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div>
          <button
            ref={addButtonRef}
            className="btn-add-param text-link pr-2 py-3 mt-2 select-none"
            onClick={addVariable}
            data-testid="add-variable"
          >
            + Add Variable
          </button>
        </div>
      </div>

      <div>
        <button type="submit" className="submit btn btn-md btn-secondary mt-2" onClick={formik.handleSubmit} data-testid="save-env">
          Save
        </button>
        <button type="submit" className="ml-2 px-1 submit btn btn-md btn-secondary mt-2" onClick={handleReset} data-testid="reset-env">
          Reset
        </button>
      </div>
    </StyledWrapper>
  );
};
export default EnvironmentVariables;
