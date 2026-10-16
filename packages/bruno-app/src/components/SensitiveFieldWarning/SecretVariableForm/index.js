import React, { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import find from 'lodash/find';
import TextInput from 'ui/TextInput';
import MaskedInput from 'ui/MaskedInput';
import useOnClickOutside from 'hooks/useOnClickOutside';
import { findEnvironmentInCollection, getAvailableAddToScopes } from 'utils/collections';
import { createScopeEnvironment } from 'utils/collections/createScopeEnvironment';
import { INVALID_VARIABLE_NAME_ERROR, variableNameRegex } from 'utils/common/regex';
import { VARIABLE_ADD_SCOPES } from 'utils/common/constants';
import { replaceVariableReferences } from 'utils/sensitive-fields';
import EnvironmentTargetOption from './EnvironmentTargetOption';
import StyledWrapper from './StyledWrapper';

/** Turns `{{name}}ddd` into `nameddd`. Variables are kept as text, not resolved. */
const removeVariableBraces = (text) => replaceVariableReferences(text, (name) => name);

/** Returns an error per field; empty object means valid. */
const validate = ({ name, value }) => {
  const errors = {};
  if (!name) {
    errors.name = 'Name cannot be empty';
  } else if (!variableNameRegex.test(name)) {
    errors.name = INVALID_VARIABLE_NAME_ERROR;
  }
  if (!value) {
    errors.value = 'Value cannot be empty';
  }
  return errors;
};

const isEnvironmentTarget = (scope) => (
  scope.type === VARIABLE_ADD_SCOPES.GLOBAL || scope.type === VARIABLE_ADD_SCOPES.ENVIRONMENT
);

const SecretVariableForm = ({ collection, sourceLabel, defaultName, defaultValue, onSave, onClose }) => {
  const [name, setName] = useState(defaultName);
  const [value, setValue] = useState(removeVariableBraces(defaultValue));
  const [selectedTargetType, setSelectedTargetType] = useState(null);
  const [errors, setErrors] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const formRef = useRef(null);

  const globalEnvironments = useSelector((state) => state.globalEnvironments.globalEnvironments);
  const activeGlobalEnvironmentUid = useSelector((state) => state.globalEnvironments.activeGlobalEnvironmentUid);

  const activeEnvironment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);
  const activeGlobalEnvironment = find(globalEnvironments, (environment) => environment.uid === activeGlobalEnvironmentUid);

  const targets = getAvailableAddToScopes({
    activeEnvironmentUid: activeEnvironment?.uid,
    activeEnvironmentName: activeEnvironment?.name,
    activeGlobalEnvironmentUid: activeGlobalEnvironment?.uid,
    activeGlobalEnvironmentName: activeGlobalEnvironment?.name
  }).filter(isEnvironmentTarget);

  /** Saves on outside click or Enter. Without a selected environment it only closes. */
  const submit = () => {
    if (isSaving) return;
    if (!selectedTargetType) {
      onClose();
      return;
    }

    const trimmedName = name.trim();
    const validationErrors = validate({ name: trimmedName, value });
    setErrors(validationErrors);
    if (Object.keys(validationErrors).length > 0) return;

    setIsSaving(true);
    onSave({ name: trimmedName, value, targetType: selectedTargetType })
      .then(onClose)
      .catch((error) => {
        setErrors({ form: error.message });
        setIsSaving(false);
      });
  };

  useOnClickOutside(formRef, submit);

  const handleKeyDown = (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      submit();
    }
  };

  /** Creates the environment from "Create One" and selects it as the target. */
  const createEnvironment = (targetType, environmentName) => (
    createScopeEnvironment(targetType, environmentName, collection.uid)
      .then(() => setSelectedTargetType(targetType))
  );

  return (
    <StyledWrapper
      ref={formRef}
      role="dialog"
      aria-label="Save as a secret variable"
      data-testid="secret-variable-form"
    >
      <div className="flex items-baseline justify-between gap-2">
        <div className="form-title">Save as a secret variable</div>
        {sourceLabel && (
          <div className="source-badge" data-testid="secret-variable-source">
            from <span className="source-badge-label">{sourceLabel}</span>
          </div>
        )}
      </div>

      <TextInput
        id="secret-variable-name"
        label="Name"
        value={name}
        error={errors.name}
        autoFocus={!sourceLabel}
        data-testid="secret-variable-name-input"
        onChange={(event) => setName(event.target.value)}
        onKeyDown={handleKeyDown}
      />

      <MaskedInput
        id="secret-variable-value"
        label="Value"
        value={value}
        error={errors.value}
        autoFocus={!!sourceLabel}
        data-testid="secret-variable-value-input"
        onChange={(event) => setValue(event.target.value)}
        onKeyDown={handleKeyDown}
      />

      <div className="save-to-title">Save to</div>
      <div className="save-to-list">
        {targets.map((target) => (
          <EnvironmentTargetOption
            key={target.type}
            target={target}
            isSelected={selectedTargetType === target.type}
            onSelect={setSelectedTargetType}
            onCreate={(environmentName) => createEnvironment(target.type, environmentName)}
          />
        ))}
      </div>
      {errors.form && <div className="form-error" data-testid="secret-variable-error">{errors.form}</div>}
    </StyledWrapper>
  );
};

export default SecretVariableForm;
