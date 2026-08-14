import { VARIABLE_ADD_SCOPES } from 'utils/common/constants';

const CHEVRON_ICON_SVG_TEXT = `
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="6,9 12,15 18,9"></polyline>
</svg>
`;

const SCOPE_ICON_LETTER = {
  [VARIABLE_ADD_SCOPES.REQUEST]: 'R',
  [VARIABLE_ADD_SCOPES.FOLDER]: 'F',
  [VARIABLE_ADD_SCOPES.COLLECTION]: 'C',
  [VARIABLE_ADD_SCOPES.ENVIRONMENT]: 'E',
  [VARIABLE_ADD_SCOPES.GLOBAL]: 'G'
};

const createScopeIcon = (scope, { muted = false } = {}) => {
  const icon = document.createElement('span');
  icon.className = `var-add-to-option-icon var-add-to-option-icon-${scope.type}`;
  if (muted) {
    icon.classList.add('var-add-to-option-icon-muted');
  }
  icon.textContent = SCOPE_ICON_LETTER[scope.type] || scope.label?.charAt(0)?.toUpperCase() || '?';
  return icon;
};

const clearRow = (row) => {
  row.innerHTML = '';
};

const renderScopeOption = (row, scope, { handleScopeSwitch, clearError }) => {
  clearRow(row);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'var-add-to-option-trigger';
  trigger.setAttribute('data-testid', `var-info-add-to-option-${scope.type}`);

  trigger.appendChild(createScopeIcon(scope));

  const label = document.createElement('span');
  label.className = 'var-add-to-option-label';
  label.textContent = scope.label;
  label.title = scope.label;
  trigger.appendChild(label);

  trigger.addEventListener('click', () => {
    clearError();
    handleScopeSwitch(scope);
  });

  row.appendChild(trigger);
};

const submitCreateEnvironment = ({
  scope,
  nameInput,
  createButton,
  actions,
  revert
}) => {
  const {
    handleScopeSwitch,
    onCreateEnvironment,
    showError,
    clearError,
    unregisterActiveCreateForm
  } = actions;

  const name = nameInput.value.trim();

  if (!name) {
    showError('Environment name is required');
    return;
  }

  clearError();

  createButton.disabled = true;
  createButton.textContent = 'Creating…';
  nameInput.disabled = true;

  onCreateEnvironment(scope, name)
    .then(() => {
      unregisterActiveCreateForm(revert);
      // once new env is created, add the variable to it and save immediately
      handleScopeSwitch(scope, { immediate: true });
    })
    .catch((err) => {
      showError(err?.message || 'Failed to create environment');

      createButton.disabled = false;
      createButton.textContent = 'Create';
      nameInput.disabled = false;
    });
};

const renderCreateEnvironment = (row, scope, actions) => {
  clearRow(row);

  const {
    registerActiveCreateForm,
    unregisterActiveCreateForm
  } = actions;

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'var-add-to-inline-env-name-input';
  nameInput.placeholder = 'Enter environment name';
  nameInput.setAttribute('aria-label', `${scope.label} name`);
  nameInput.setAttribute(
    'data-testid',
    'var-info-add-to-create-env-name-input'
  );

  const createButton = document.createElement('button');
  createButton.type = 'button';
  createButton.className = 'var-add-to-inline-create-button';
  createButton.textContent = 'Create';
  createButton.setAttribute(
    'data-testid',
    'var-info-add-to-create-env-submit'
  );

  row.append(nameInput, createButton);

  // Restores this row back to the "No Environment" state.
  const revert = () => {
    unregisterActiveCreateForm(revert);
    renderNoEnvironmentInline(row, scope, actions);
  };

  // Register this form so any previously open form is closed and outside clicks
  // can restore this row via `revert`.
  registerActiveCreateForm(revert, row);

  const submit = () =>
    submitCreateEnvironment({
      scope,
      nameInput,
      createButton,
      actions,
      revert
    });

  createButton.addEventListener('click', (e) => {
    e.stopPropagation();
    submit();
  });

  nameInput.addEventListener('click', (e) => e.stopPropagation());

  nameInput.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') {
      return;
    }

    e.preventDefault();
    submit();
  });

  nameInput.focus();
};

const renderNoEnvironmentInline = (row, scope, actions) => {
  clearRow(row);

  row.appendChild(createScopeIcon(scope, { muted: true }));

  const note = document.createElement('span');
  note.className = 'var-add-to-option-note';
  note.setAttribute('data-testid', 'var-info-add-to-no-env-note');

  note.appendChild(document.createTextNode(`No ${scope.label} selected. `));

  const createLink = document.createElement('button');
  createLink.type = 'button';
  createLink.className = 'var-add-to-link-button';
  createLink.setAttribute('data-testid', 'var-info-add-to-create-env-button');
  createLink.textContent = 'Create One';

  createLink.addEventListener('click', (e) => {
    e.stopPropagation();
    renderCreateEnvironment(row, scope, actions);
  });

  note.appendChild(createLink);
  row.appendChild(note);
};

const buildScopeRow = (scope, actions) => {
  const row = document.createElement('div');
  row.className = 'var-add-to-option';

  const isEnvironmentScope = (scope) =>
    scope.type === VARIABLE_ADD_SCOPES.GLOBAL
    || scope.type === VARIABLE_ADD_SCOPES.ENVIRONMENT;

  // If the scope is an environment and it's not enabled,
  // show the "No Environment" message with a "Create One" link.
  if (isEnvironmentScope(scope) && !scope.enabled) {
    renderNoEnvironmentInline(row, scope, actions);
  } else {
    renderScopeOption(row, scope, actions);
  }

  return row;
};

function createAddToScopeSwitcherDOM() {
  const container = document.createElement('div');
  container.className = 'var-add-to-switcher';
  container.setAttribute('data-testid', 'var-info-add-to');

  const controlsRow = document.createElement('div');
  controlsRow.className = 'var-add-to-controls';
  container.appendChild(controlsRow);

  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'var-add-to-toggle';
  toggle.setAttribute('data-testid', 'var-info-add-to-toggle');
  controlsRow.appendChild(toggle);

  const toggleLabel = document.createElement('span');
  toggleLabel.className = 'var-add-to-toggle-label';
  toggleLabel.textContent = 'Add to';
  toggle.appendChild(toggleLabel);

  const toggleChevron = document.createElement('span');
  toggleChevron.className = 'var-add-to-toggle-chevron';
  toggleChevron.innerHTML = CHEVRON_ICON_SVG_TEXT;
  toggle.appendChild(toggleChevron);

  // Only shown when the currently active scope (Global/Environment) supports secrets.
  const secretLabel = document.createElement('label');
  secretLabel.className = 'var-add-to-secret-label';
  secretLabel.style.display = 'none';
  controlsRow.appendChild(secretLabel);

  const secretCheckbox = document.createElement('input');
  secretCheckbox.type = 'checkbox';
  secretCheckbox.className = 'var-add-to-secret-checkbox';
  secretCheckbox.setAttribute('data-testid', 'var-info-add-to-secret-checkbox');
  secretLabel.appendChild(secretCheckbox);

  const secretLabelText = document.createElement('span');
  secretLabelText.textContent = 'Secret';
  secretLabel.appendChild(secretLabelText);

  const list = document.createElement('div');
  list.className = 'var-add-to-list';
  list.setAttribute('data-testid', 'var-info-add-to-list');
  list.style.display = 'none';
  container.appendChild(list);

  const errorNote = document.createElement('div');
  errorNote.className = 'var-warning-note';
  errorNote.setAttribute('data-testid', 'var-info-add-to-error');
  errorNote.style.display = 'none';
  container.appendChild(errorNote);

  return {
    container,
    toggle,
    toggleChevron,
    secretLabel,
    secretCheckbox,
    list,
    errorNote
  };
}

function createDropdownController({ toggle, list, toggleChevron }) {
  const open = () => {
    list.style.display = 'block';
    toggleChevron.classList.add('var-add-to-toggle-chevron-open');
  };

  const close = () => {
    list.style.display = 'none';
    toggleChevron.classList.remove('var-add-to-toggle-chevron-open');
  };

  toggle.addEventListener('click', () => {
    if (list.style.display === 'none') {
      open();
    } else {
      close();
    }
  });

  return {
    open,
    close
  };
}

function createErrorController(errorNote) {
  const show = (message) => {
    errorNote.textContent = message;
    errorNote.style.display = 'block';
  };

  const clear = () => {
    errorNote.textContent = '';
    errorNote.style.display = 'none';
  };

  return {
    show,
    clear
  };
}

// Ensures only one inline "Create Environment" form is open at a time and
// closes it when the user clicks outside.
function createInlineCreateFormManager() {
  let activeRevert = null;
  let activeRow = null;

  // Closes the active inline create form when clicking outside its row.
  const handleOutsideClick = (e) => {
    if (!activeRevert || !activeRow || activeRow.contains(e.target)) {
      return;
    }

    const revert = activeRevert;

    activeRevert = null;
    activeRow = null;
    document.removeEventListener('mousedown', handleOutsideClick);

    revert();
  };

  const register = (revert, row) => {
    // Only one inline create form can be active at a time.
    if (activeRevert && activeRevert !== revert) {
      const previousRevert = activeRevert;

      activeRevert = null;
      activeRow = null;

      previousRevert();
    }

    activeRevert = revert;
    activeRow = row;

    document.addEventListener('mousedown', handleOutsideClick);
  };

  const unregister = (revert) => {
    if (activeRevert !== revert) {
      return;
    }

    activeRevert = null;
    activeRow = null;

    document.removeEventListener('mousedown', handleOutsideClick);
  };

  const destroy = () => {
    activeRevert = null;
    activeRow = null;
    document.removeEventListener('mousedown', handleOutsideClick);
  };

  return {
    register,
    unregister,
    destroy
  };
}

function renderScopeRows({ list, scopes, rowActions }) {
  const fragment = document.createDocumentFragment();
  const rowsByType = {};

  for (const scope of scopes) {
    const row = buildScopeRow(scope, rowActions);
    rowsByType[scope.type] = row;
    fragment.appendChild(row);
  }

  list.appendChild(fragment);

  return rowsByType;
}

function createActiveRowTracker(rowsByType) {
  let activeRow = null;

  const setActiveScope = (scope) => {
    if (activeRow) {
      activeRow.classList.remove('var-add-to-option-active');
      activeRow = null;
    }

    const row = scope && rowsByType[scope.type];
    if (row) {
      row.classList.add('var-add-to-option-active');
      activeRow = row;
    }
  };

  return { setActiveScope };
}

function createSecretController({ secretLabel, secretCheckbox, onSecretChange }) {
  let currentScope = null;

  const getSecret = () => !!(currentScope && currentScope.supportsSecret) && secretCheckbox.checked;

  const notifyChange = () => {
    if (typeof onSecretChange === 'function') {
      onSecretChange(getSecret());
    }
  };

  const setCurrentScope = (scope) => {
    currentScope = scope;
    const supportsSecret = !!(scope && scope.supportsSecret);
    secretLabel.style.display = supportsSecret ? 'inline-flex' : 'none';
    if (!supportsSecret) {
      secretCheckbox.checked = false;
    }
    notifyChange();
  };

  secretCheckbox.addEventListener('change', (e) => {
    e.stopPropagation();
    notifyChange();
  });

  return { setCurrentScope, getSecret };
}

/**
 * Builds the "Add to" toggle + scope list dropdown, plus a Secret checkbox that appears once
 * a secret-capable scope is selected.
 *
 * @param {Array<{type: string, label: string, enabled: boolean, supportsSecret: boolean}>} scopes
 * @param {{type: string, label: string, enabled: boolean, supportsSecret: boolean}} initialScope -
 *   The scope currently active before any switch (the guessed scope). used to set the secret
 *   checkbox's initial visibility.
 * @param {(scope: Object, options?: {immediate?: boolean}) => void} onSwitchScope - Repoints the
 *   pending target scope. When `immediate` is true (after creating a brand new environment),
 *   the caller should save right away rather than waiting for the next blur.
 * @param {(scope: Object, name: string) => Promise<void>} onCreateEnvironment
 * @param {(secret: boolean) => void} [onSecretChange] - Called whenever the Secret checkbox is toggled or the active scope changes.
 */
export const createAddToScopeSwitcher = ({
  scopes,
  initialScope,
  onSwitchScope,
  onCreateEnvironment,
  onSecretChange
}) => {
  const switcherElements = createAddToScopeSwitcherDOM();

  const dropdown = createDropdownController(switcherElements);
  const error = createErrorController(switcherElements.errorNote);
  const createFormManager = createInlineCreateFormManager();
  const secretController = createSecretController({
    secretLabel: switcherElements.secretLabel,
    secretCheckbox: switcherElements.secretCheckbox,
    onSecretChange
  });

  secretController.setCurrentScope(initialScope);

  let activeRowTracker = null;

  const handleScopeSwitch = (scope, options) => {
    dropdown.close();
    error.clear();
    secretController.setCurrentScope(scope);
    if (activeRowTracker) {
      activeRowTracker.setActiveScope(scope);
    }
    onSwitchScope(scope, options);
  };

  const rowsByType = renderScopeRows({
    list: switcherElements.list,
    scopes,
    rowActions: {
      handleScopeSwitch,
      onCreateEnvironment,
      showError: error.show,
      clearError: error.clear,
      registerActiveCreateForm: createFormManager.register,
      unregisterActiveCreateForm: createFormManager.unregister
    }
  });

  activeRowTracker = createActiveRowTracker(rowsByType);
  activeRowTracker.setActiveScope(initialScope);

  switcherElements.container._destroy = createFormManager.destroy;
  switcherElements.container._getPendingSecret = secretController.getSecret;

  return switcherElements.container;
};
