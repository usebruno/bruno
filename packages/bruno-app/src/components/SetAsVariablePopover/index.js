import React, { useRef, useState } from 'react';
import { useDispatch, useSelector, useStore } from 'react-redux';
import toast from 'react-hot-toast';
import { IconCheck, IconChevronDown, IconCopy } from '@tabler/icons';
import Dropdown from 'components/Dropdown';
import Button from 'ui/Button';
import useCopyToClipboard from 'hooks/useCopyToClipboard';
import { updateVariableInScope } from 'providers/ReduxStore/slices/collections/actions';
import { buildAddToScopes, buildScopeInfo, createEnvironmentForScope, getScopeVariableNames } from 'utils/variables';
import { replaceSelectionWithVariable } from 'utils/codemirror/selection';
import { variableNameRegex } from 'utils/common/regex';
import { SCOPE_ICON, VARIABLE_ADD_SCOPES } from 'utils/common/constants';
import StyledWrapper from './StyledWrapper';

const COPY_SUCCESS_TIMEOUT = 1000;
const INVALID_NAME_ERROR
  = 'Variable contains invalid characters. Must only contain alphanumeric characters, "-", "_", "."';

const SCOPE_BADGE_LABEL = {
  [VARIABLE_ADD_SCOPES.GLOBAL]: 'Global',
  [VARIABLE_ADD_SCOPES.ENVIRONMENT]: 'Environment',
  [VARIABLE_ADD_SCOPES.COLLECTION]: 'Collection',
  [VARIABLE_ADD_SCOPES.FOLDER]: 'Folder',
  [VARIABLE_ADD_SCOPES.REQUEST]: 'Request'
};

const summariseValue = (text) => {
  const lineCount = (text.match(/\n/g) || []).length + 1;
  return lineCount > 1 ? `${text.split('\n')[0]} … (${lineCount} lines)` : text;
};

const pickDefaultScope = (scopes) => {
  const request = scopes.find((scope) => scope.type === VARIABLE_ADD_SCOPES.REQUEST && scope.enabled);
  if (request) return request.type;
  return scopes.find((scope) => scope.enabled)?.type || null;
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
  const { copied, copyToClipboard } = useCopyToClipboard(COPY_SUCCESS_TIMEOUT);

  const scopes = buildAddToScopes({
    state: { collections: { collections }, globalEnvironments },
    collection: selection.collection,
    item: selection.item
  });

  const [name, setName] = useState('');
  const [scopeType, setScopeType] = useState(() => pickDefaultScope(scopes));
  const [scopeListOpen, setScopeListOpen] = useState(false);
  const [secret, setSecret] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creatingScopeType, setCreatingScopeType] = useState(null);
  const [environmentName, setEnvironmentName] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState(null);
  const nameInputRef = useRef(null);

  const openCreateForm = (scope) => {
    setCreatingScopeType(scope.type);
    setEnvironmentName('');
    setCreateError(null);
  };

  const closeCreateForm = () => {
    setCreatingScopeType(null);
    setEnvironmentName('');
    setCreateError(null);
  };

  const handleCreateEnvironment = (scope) => {
    if (!environmentName.trim()) {
      setCreateError('Environment name is required');
      return;
    }

    setCreating(true);
    setCreateError(null);

    createEnvironmentForScope({
      scope,
      name: environmentName,
      collectionUid: selection.collection?.uid,
      store
    })
      .then(() => {
        setCreating(false);
        closeCreateForm();
        setScopeType(scope.type);
      })
      .catch((error) => {
        setCreating(false);
        setCreateError(error.message || 'Failed to create environment');
      });
  };

  const selectedScope = scopes.find((scope) => scope.type === scopeType) || null;
  const existingVariableNames = scopeType
    ? getScopeVariableNames({
        scopeType,
        state: { collections: { collections }, globalEnvironments },
        collection: selection.collection,
        item: selection.item
      })
    : new Set();
  const overwrites = !!name && !!selectedScope && existingVariableNames.has(name);
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
      if (scopeListOpen) {
        setScopeListOpen(false);
        return;
      }
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
        <div className="var-set-header">
          <div className="var-set-value" title={selection.text} data-testid="set-as-variable-value">
            {summariseValue(selection.text)}
          </div>
          {selectedScope ? (
            <span className="var-set-scope-badge" data-testid="set-as-variable-scope-badge">
              <ScopeIcon scopeType={selectedScope.type} />
              {SCOPE_BADGE_LABEL[selectedScope.type]}
            </span>
          ) : null}
        </div>

        <div className="var-set-name-field">
          <input
            ref={nameInputRef}
            type="text"
            autoFocus
            autoComplete="off"
            spellCheck={false}
            placeholder="Variable name"
            className="var-set-name-input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            data-testid="set-as-variable-name"
          />
          <button
            type="button"
            className={`var-set-copy-button ${copied ? 'is-copied' : ''}`}
            title={copied ? 'Copied' : 'Copy value'}
            aria-label={copied ? 'Copied' : 'Copy value'}
            onClick={() => copyToClipboard(selection.text)}
            data-testid="set-as-variable-copy"
          >
            {copied ? <IconCheck size={14} strokeWidth={1.5} /> : <IconCopy size={14} strokeWidth={1.5} />}
          </button>
        </div>

        {nameError ? (
          <div className="var-set-error" data-testid="set-as-variable-name-error">
            {nameError}
          </div>
        ) : null}

        {!nameError && overwrites ? (
          <div className="var-set-warning" data-testid="set-as-variable-overwrite-warning">
            {`Replaces the existing "${name}" in ${selectedScope.label}`}
          </div>
        ) : null}

        <div className="var-set-controls">
          <button
            type="button"
            className="var-set-add-to-toggle"
            aria-expanded={scopeListOpen}
            onClick={() => setScopeListOpen((open) => !open)}
            data-testid="set-as-variable-add-to-toggle"
          >
            Add to
            <IconChevronDown
              size={12}
              strokeWidth={1.5}
              className={`var-set-add-to-chevron ${scopeListOpen ? 'is-open' : ''}`}
            />
          </button>

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
        </div>

        {scopeListOpen ? (
          <div className="var-set-scope-list" data-testid="set-as-variable-scopes">
            {scopes.map((scope) => {
              if (creatingScopeType === scope.type) {
                return (
                  <div key={scope.type} className="var-set-scope-option is-creating">
                    <input
                      type="text"
                      autoFocus
                      disabled={creating}
                      placeholder="Enter environment name"
                      aria-label={`${scope.label} name`}
                      className="var-set-create-env-input"
                      value={environmentName}
                      onChange={(event) => setEnvironmentName(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          handleCreateEnvironment(scope);
                        }
                      }}
                      data-testid="set-as-variable-create-env-name"
                    />
                    <button
                      type="button"
                      disabled={creating}
                      className="var-set-create-env-submit"
                      onClick={() => handleCreateEnvironment(scope)}
                      data-testid="set-as-variable-create-env-submit"
                    >
                      {creating ? 'Creating…' : 'Create'}
                    </button>
                  </div>
                );
              }

              if (!scope.enabled) {
                return (
                  <div key={scope.type} className="var-set-scope-option is-disabled">
                    <ScopeIcon scopeType={scope.type} muted />
                    <span className="var-set-note">{`No ${scope.label} selected`}</span>
                    <button
                      type="button"
                      className="var-set-create-env-link"
                      onClick={() => openCreateForm(scope)}
                      data-testid={`set-as-variable-create-env-${scope.type}`}
                    >
                      Create One
                    </button>
                  </div>
                );
              }

              return (
                <div
                  key={scope.type}
                  className={`var-set-scope-option ${scope.type === scopeType ? 'is-active' : ''}`}
                >
                  <button
                    type="button"
                    className="var-set-scope-trigger"
                    onClick={() => {
                      setScopeType(scope.type);
                      setScopeListOpen(false);
                    }}
                    data-testid={`set-as-variable-scope-${scope.type}`}
                  >
                    <ScopeIcon scopeType={scope.type} />
                    <span className="var-set-scope-label">{scope.label}</span>
                  </button>
                </div>
              );
            })}
            {createError ? (
              <div className="var-set-error" data-testid="set-as-variable-create-env-error">
                {createError}
              </div>
            ) : null}
          </div>
        ) : null}

        <div className="var-set-footer">
          <Button size="sm" variant="ghost" color="secondary" onClick={onClose} data-testid="set-as-variable-cancel">
            Cancel
          </Button>
          <Button size="sm" disabled={!canSave} onClick={handleSave} data-testid="set-as-variable-save">
            {overwrites ? 'Overwrite' : 'Set Variable'}
          </Button>
        </div>
      </StyledWrapper>
    </Dropdown>
  );
};

export default SetAsVariablePopover;
