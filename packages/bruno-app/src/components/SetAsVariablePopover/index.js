import React, { useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import toast from 'react-hot-toast';
import Dropdown from 'components/Dropdown';
import Button from 'ui/Button';
import { updateVariableInScope } from 'providers/ReduxStore/slices/collections/actions';
import { buildAddToScopes, buildScopeInfo } from 'utils/variables';
import { replaceSelectionWithVariable } from 'utils/codemirror/selection';
import { variableNameRegex } from 'utils/common/regex';
import { SCOPE_ICON, VARIABLE_ADD_SCOPES } from 'utils/common/constants';
import StyledWrapper from './StyledWrapper';

const DERIVED_NAME_LIMIT = 40;
const INVALID_NAME_ERROR
  = 'Variable contains invalid characters. Must only contain alphanumeric characters, "-", "_", "."';

const SCOPES_THAT_WRITE_TO_DISK = [
  VARIABLE_ADD_SCOPES.REQUEST,
  VARIABLE_ADD_SCOPES.FOLDER,
  VARIABLE_ADD_SCOPES.COLLECTION
];

const deriveInitialName = (text) => {
  const trimmed = (text || '').trim();
  if (!trimmed || trimmed.length > DERIVED_NAME_LIMIT || !variableNameRegex.test(trimmed)) {
    return '';
  }
  return trimmed;
};

const summariseValue = (text) => {
  const lineCount = (text.match(/\n/g) || []).length + 1;
  return lineCount > 1 ? `${text.split('\n')[0]} … (${lineCount} lines)` : text;
};

const ScopeIcon = ({ scopeType, muted }) => (
  <span
    className={`var-set-scope-icon var-set-scope-icon-${muted ? 'muted' : scopeType}`}
    dangerouslySetInnerHTML={{ __html: SCOPE_ICON[scopeType] }}
  />
);

const anchorStyle = (selection) => ({
  position: 'fixed',
  left: `${selection?.x || 0}px`,
  top: `${selection?.y || 0}px`,
  width: '1px',
  height: '1px',
  pointerEvents: 'none'
});

const SetAsVariablePopover = ({ selection, onClose }) => {
  const dispatch = useDispatch();
  const store = useStore();
  const collections = useSelector((state) => state.collections.collections);
  const globalEnvironments = useSelector((state) => state.globalEnvironments);

  const scopes = buildAddToScopes({
    state: { collections: { collections }, globalEnvironments },
    collection: selection.collection,
    item: selection.item
  });

  const [name, setName] = useState(() => deriveInitialName(selection.text));
  const [scopeType, setScopeType] = useState(null);
  const [secret, setSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const nameInputRef = useRef(null);

  const selectedScope = scopes.find((scope) => scope.type === scopeType) || null;
  const hasSelectableScope = scopes.some((scope) => scope.enabled);
  const nameError = name && !variableNameRegex.test(name) ? INVALID_NAME_ERROR : null;
  const canSave = !!name && !nameError && !!selectedScope && !saving;

  const handleSave = () => {
    if (!canSave) return;

    const scopeInfo = buildScopeInfo({
      scopeType,
      state: store.getState(),
      collection: selection.collection,
      item: selection.item,
      secret: selectedScope.supportsSecret ? secret : false
    });

    setSaving(true);
    dispatch(updateVariableInScope(name, selection.text, scopeInfo, selection.collection?.uid))
      .then(() => {
        const replaced = replaceSelectionWithVariable(selection, name);
        toast.success(
          replaced || !selection.editable
            ? `Variable "${name}" saved`
            : `Variable "${name}" saved (selection changed, text not replaced)`
        );
        onClose();
      })
      .catch((error) => {
        setSaving(false);
        toast.error(error.message);
      });
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Escape') {
      event.stopPropagation();
      onClose();
      return;
    }

    if (event.key === 'Enter' && event.target === nameInputRef.current) {
      event.preventDefault();
      handleSave();
    }
  };

  return (
    <Dropdown
      visible={true}
      placement="bottom-start"
      appendTo={document.body}
      onClickOutside={onClose}
      noPadding={true}
      icon={<div style={anchorStyle(selection)} />}
    >
      <StyledWrapper data-testid="set-as-variable-popover" onKeyDown={handleKeyDown}>
        <div className="var-set-title">Set as new variable</div>

        <div className="var-set-row">
          <label className="var-set-row-label" htmlFor="set-as-variable-name">
            Name
          </label>
          <input
            id="set-as-variable-name"
            ref={nameInputRef}
            type="text"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            className="var-set-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            data-testid="set-as-variable-name"
          />
        </div>

        {nameError ? (
          <div className="var-set-error" data-testid="set-as-variable-name-error">
            {nameError}
          </div>
        ) : null}

        <div className="var-set-row">
          <label className="var-set-row-label" htmlFor="set-as-variable-value">
            Value
          </label>
          <input
            id="set-as-variable-value"
            type="text"
            readOnly
            className="var-set-input"
            value={summariseValue(selection.text)}
            data-testid="set-as-variable-value"
          />
        </div>

        <div className="var-set-scope-section">
          <div className="var-set-scope-heading">Scope</div>
          <div className="var-set-scope-list" data-testid="set-as-variable-scopes">
            {scopes.map((scope) => (
              <button
                key={scope.type}
                type="button"
                disabled={!scope.enabled}
                className={`var-set-scope-option ${scope.type === scopeType ? 'is-active' : ''}`}
                onClick={() => setScopeType(scope.type)}
                data-testid={`set-as-variable-scope-${scope.type}`}
              >
                <ScopeIcon scopeType={scope.type} muted={!scope.enabled} />
                <span className="var-set-scope-label">
                  {scope.enabled ? scope.label : `No ${scope.label} selected`}
                </span>
                {scope.enabled && SCOPES_THAT_WRITE_TO_DISK.includes(scope.type) ? (
                  <span className="var-set-note">saves to disk</span>
                ) : null}
              </button>
            ))}
          </div>
        </div>

        {!hasSelectableScope ? (
          <div className="var-set-hint" data-testid="set-as-variable-no-scope">
            No scope is available here. Select or create an environment first.
          </div>
        ) : null}

        {selectedScope?.supportsSecret ? (
          <label className="var-set-secret-label">
            <input
              type="checkbox"
              checked={secret}
              onChange={(event) => setSecret(event.target.checked)}
              data-testid="set-as-variable-secret"
            />
            Secret
          </label>
        ) : null}

        <div className="var-set-footer">
          <Button size="sm" disabled={!canSave} onClick={handleSave} data-testid="set-as-variable-save">
            Set Variable
          </Button>
          <Button size="sm" variant="ghost" color="secondary" onClick={onClose} data-testid="set-as-variable-cancel">
            Cancel
          </Button>
        </div>
      </StyledWrapper>
    </Dropdown>
  );
};

export default SetAsVariablePopover;
