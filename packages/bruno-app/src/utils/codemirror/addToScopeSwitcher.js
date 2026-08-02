import { VARIABLE_ADD_SCOPES } from 'utils/common/constants';

const CHEVRON_ICON_SVG_TEXT = `
<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
  <polyline points="6,9 12,15 18,9"></polyline>
</svg>
`;

const isEnvironmentScope = (scope) =>
  scope.type === VARIABLE_ADD_SCOPES.GLOBAL
  || scope.type === VARIABLE_ADD_SCOPES.ENVIRONMENT;

const clearRow = (row) => {
  row.innerHTML = '';
};

// Renders a single scope option in the "Add to" list.
const renderScopeOption = (row, scope, { handleScopeSwitch, clearError }) => {
  clearRow(row);

  const trigger = document.createElement('button');
  trigger.type = 'button';
  trigger.className = 'var-add-to-option-trigger';
  trigger.setAttribute('data-testid', `var-info-add-to-option-${scope.type}`);

  const label = document.createElement('span');
  label.className = 'var-add-to-option-label';
  label.textContent = scope.label;
  trigger.appendChild(label);

  trigger.addEventListener('click', () => {
    clearError();
    handleScopeSwitch(scope);
  });

  row.appendChild(trigger);
};

// Renders the "Create Environment" inline form when the user clicks "Create One" in the "No Environment" message.
const renderCreateEnvironment = (row, scope, actions) => {
  clearRow(row);

  const { handleScopeSwitch, onCreateEnvironment, showError, clearError, registerActiveCreateForm, unregisterActiveCreateForm } = actions;

  const nameInput = document.createElement('input');
  nameInput.type = 'text';
  nameInput.className = 'var-add-to-inline-env-name-input';
  nameInput.setAttribute('data-testid', 'var-info-add-to-create-env-name-input');
  nameInput.placeholder = 'Enter environment name';
  row.appendChild(nameInput);

  const createButton = document.createElement('button');
  createButton.type = 'button';
  createButton.className = 'var-add-to-inline-create-button';
  createButton.setAttribute('data-testid', 'var-info-add-to-create-env-submit');
  createButton.textContent = 'Create';
  row.appendChild(createButton);

  const revert = () => {
    unregisterActiveCreateForm(revert);
    renderNoEnvironmentInline(row, scope, actions);
  };

  registerActiveCreateForm(revert, row);

  const submit = () => {
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
        handleScopeSwitch(scope);
      })
      .catch((err) => {
        showError(err?.message || 'Failed to create environment');

        createButton.disabled = false;
        createButton.textContent = 'Create';
        nameInput.disabled = false;
      });
  };

  createButton.addEventListener('click', (e) => {
    e.stopPropagation();
    submit();
  });

  nameInput.addEventListener('click', (e) => e.stopPropagation());

  nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      submit();
    }
  });

  nameInput.focus();
};

// Renders the "No Environment" message with a "Create One" link when no environment is selected.
const renderNoEnvironmentInline = (row, scope, actions) => {
  clearRow(row);

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

  // If the scope is an environment and it's not enabled, show the "No Environment" message with a "Create One" link.
  if (isEnvironmentScope(scope) && !scope.enabled) {
    renderNoEnvironmentInline(row, scope, actions);
  } else {
    renderScopeOption(row, scope, actions);
  }

  return row;
};

/**
 * Builds the "Add to" button with the scope list dropdown.
 *
 * @param {Array<{type: string, label: string, enabled: boolean}>} scopes
 * @param {(scope: Object) => void} onSwitchScope
 * @param {(scope: Object, name: string) => Promise<void>} onCreateEnvironment
 */
export const createAddToScopeSwitcher = ({
  scopes,
  onSwitchScope,
  onCreateEnvironment
}) => {
  const container = document.createElement('div');
  container.className = 'var-add-to-switcher';
  container.setAttribute('data-testid', 'var-info-add-to');

  const addToToggle = document.createElement('button');
  addToToggle.type = 'button';
  addToToggle.className = 'var-add-to-toggle';
  addToToggle.setAttribute('data-testid', 'var-info-add-to-toggle');
  container.appendChild(addToToggle);

  const addToToggleLabel = document.createElement('span');
  addToToggleLabel.className = 'var-add-to-toggle-label';
  addToToggleLabel.textContent = 'Add to';
  addToToggle.appendChild(addToToggleLabel);

  const addToToggleChevron = document.createElement('span');
  addToToggleChevron.className = 'var-add-to-toggle-chevron';
  addToToggleChevron.innerHTML = CHEVRON_ICON_SVG_TEXT;
  addToToggle.appendChild(addToToggleChevron);

  const addToList = document.createElement('div');
  addToList.className = 'var-add-to-list';
  addToList.setAttribute('data-testid', 'var-info-add-to-list');
  addToList.style.display = 'none';
  container.appendChild(addToList);

  const errorNote = document.createElement('div');
  errorNote.className = 'var-warning-note';
  errorNote.setAttribute('data-testid', 'var-info-add-to-error');
  errorNote.style.display = 'none';
  container.appendChild(errorNote);

  const showError = (message) => {
    errorNote.textContent = message;
    errorNote.style.display = 'block';
  };

  const clearError = () => {
    errorNote.textContent = '';
    errorNote.style.display = 'none';
  };

  const closeList = () => {
    addToList.style.display = 'none';
    addToToggleChevron.classList.remove('var-add-to-toggle-chevron-open');
  };

  const openList = () => {
    addToList.style.display = 'block';
    addToToggleChevron.classList.add('var-add-to-toggle-chevron-open');
  };

  addToToggle.addEventListener('click', () => {
    if (addToList.style.display === 'none') {
      openList();
    } else {
      closeList();
    }
  });

  const handleScopeSwitch = (scope) => {
    closeList();
    clearError();
    onSwitchScope(scope);
  };

  // Tracks whichever row currently has its inline "Create Environment" form open, so at most one
  // is ever open at a time.
  let activeCreateFormRevert = null;
  let activeCreateFormRow = null;

  const handleOutsideClick = (e) => {
    if (activeCreateFormRevert && activeCreateFormRow && !activeCreateFormRow.contains(e.target)) {
      const revert = activeCreateFormRevert;
      activeCreateFormRevert = null;
      activeCreateFormRow = null;
      document.removeEventListener('mousedown', handleOutsideClick);
      revert();
    }
  };

  // Called by a row when it opens its inline create form. Closes any other row's open form
  // first, then starts listening for clicks outside this row to close it.
  const registerActiveCreateForm = (revert, row) => {
    if (activeCreateFormRevert && activeCreateFormRevert !== revert) {
      const previousRevert = activeCreateFormRevert;
      activeCreateFormRevert = null;
      activeCreateFormRow = null;
      previousRevert();
    }
    activeCreateFormRevert = revert;
    activeCreateFormRow = row;
    document.addEventListener('mousedown', handleOutsideClick);
  };

  // Called by a row when its create form closes through any other path (success, or being
  // reverted itself) so we stop tracking/listening for it.
  const unregisterActiveCreateForm = (revert) => {
    if (activeCreateFormRevert === revert) {
      activeCreateFormRevert = null;
      activeCreateFormRow = null;
      document.removeEventListener('mousedown', handleOutsideClick);
    }
  };

  const rowActions = {
    handleScopeSwitch,
    onCreateEnvironment,
    showError,
    clearError,
    registerActiveCreateForm,
    unregisterActiveCreateForm
  };

  const fragment = document.createDocumentFragment();

  for (const scope of scopes) {
    if (scope.type === VARIABLE_ADD_SCOPES.FOLDER) {
      continue;
    }

    fragment.appendChild(buildScopeRow(scope, rowActions));
  }

  addToList.appendChild(fragment);

  // Removes the document-level mousedown listener registerActiveCreateForm may have attached.
  const destroy = () => {
    activeCreateFormRevert = null;
    activeCreateFormRow = null;
    document.removeEventListener('mousedown', handleOutsideClick);
  };

  container._destroy = destroy;

  return container;
};
