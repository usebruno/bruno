import React, { useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import Tippy from '@tippyjs/react';
import toast from 'react-hot-toast';
import { IconAlertTriangle } from '@tabler/icons';
import {
  addSecretToEnvironment,
  markEnvironmentVariableAsSecret,
  removeVariableFromScope,
  saveScopeOwner
} from 'providers/ReduxStore/slices/collections/actions';
import useCloseOnEscape from 'hooks/useCloseOnEscape';
import { getActiveEnvironmentUidForScope } from 'utils/collections';
import { VARIABLE_ADD_SCOPES } from 'utils/common/constants';
import { findOverridingVariableScope, replaceVariableReferences, resolveFieldScope, resolveSensitiveVariable } from 'utils/sensitive-fields';
import SecretVariableForm from './SecretVariableForm';
import WarningTooltip from './WarningTooltip';
import StyledWrapper from './StyledWrapper';

const HOVER_CLOSE_DELAY_MS = 150;

const ACTION_LABELS = {
  plaintext: 'Save as secret variable',
  [VARIABLE_ADD_SCOPES.ENVIRONMENT]: 'Mark as secret',
  [VARIABLE_ADD_SCOPES.GLOBAL]: 'Mark as secret',
  [VARIABLE_ADD_SCOPES.REQUEST]: 'Move to environment',
  [VARIABLE_ADD_SCOPES.FOLDER]: 'Move to environment',
  [VARIABLE_ADD_SCOPES.COLLECTION]: 'Move to environment'
};

const SCOPE_LABELS = {
  [VARIABLE_ADD_SCOPES.REQUEST]: 'Request Vars',
  [VARIABLE_ADD_SCOPES.FOLDER]: 'Folder Vars',
  [VARIABLE_ADD_SCOPES.COLLECTION]: 'Collection Vars',
  [VARIABLE_ADD_SCOPES.ENVIRONMENT]: 'Collection Environment',
  [VARIABLE_ADD_SCOPES.GLOBAL]: 'Global Environment'
};

const MOVE_SCOPES = [VARIABLE_ADD_SCOPES.REQUEST, VARIABLE_ADD_SCOPES.FOLDER, VARIABLE_ADD_SCOPES.COLLECTION];

/** Active environment uid for the global or collection scope. */
const getActiveEnvironmentUid = (collection, environmentScope) => (
  environmentScope === VARIABLE_ADD_SCOPES.GLOBAL
    ? collection.activeGlobalEnvironmentUid
    : getActiveEnvironmentUidForScope(collection)
);

/** The request/folder/collection var that "Move to environment" deletes. Vars tables pass its uid; auth fields look it up by name. */
const findMovedVariable = ({ collection, item, variableName, variableUid, value }) => {
  if (variableUid) {
    return { uid: variableUid, value, ownerUid: item?.uid };
  }
  const resolved = resolveSensitiveVariable(variableName, { collection, item });
  if (!resolved) {
    return null;
  }
  return { uid: resolved.variable.uid, value: resolved.variable.value, ownerUid: resolved.owner?.uid };
};

/** The environment row that "Mark as secret" updates. Inherited rows point to their base environment. */
const getMarkAsSecretTarget = ({ collection, item, scope, variableName }) => {
  const resolved = resolveSensitiveVariable(variableName, { collection, item });
  if (!resolved) {
    return null;
  }
  return {
    collectionUid: collection.uid,
    environmentScope: scope,
    environmentUid: resolved.inheritedFrom?.uid ?? getActiveEnvironmentUid(collection, scope),
    variableUid: resolved.variable.uid
  };
};

/** Changes `{{from}}` to `{{to}}` in a field value. */
const renameVariableReference = (text, from, to) => (
  replaceVariableReferences(text, (name, match) => (name === from ? `{{${to}}}` : match))
);

/** Saves the request, folder or collection that owns the field, so the plain value leaves the file. */
const saveRequestFolderOrCollection = (collectionUid, item) => (
  saveScopeOwner({ collectionUid, scope: resolveFieldScope(item), ownerUid: item?.uid })
);

const SensitiveFieldWarning = ({
  fieldName,
  warningMessage,
  scope,
  variableName,
  value,
  variableUid,
  collection,
  item,
  disabled,
  onReplaceValue,
  onMarkAsSecret
}) => {
  const dispatch = useDispatch();
  const closeTimerRef = useRef(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [form, setForm] = useState(null);

  const collectionUid = collection?.uid;
  const movedVariable = form?.movedVariable;
  const isOpen = isHovered || isPinned || !!form;

  const close = () => {
    clearTimeout(closeTimerRef.current);
    setIsHovered(false);
    setIsPinned(false);
    setForm(null);
  };

  useCloseOnEscape(close, isPinned || !!form);

  const handleMouseEnter = () => {
    clearTimeout(closeTimerRef.current);
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    closeTimerRef.current = setTimeout(() => setIsHovered(false), HOVER_CLOSE_DELAY_MS);
  };

  const markAsSecret = () => {
    if (onMarkAsSecret) {
      return onMarkAsSecret();
    }
    const target = getMarkAsSecretTarget({ collection, item, scope, variableName });
    if (!target) {
      return Promise.reject(new Error(`"${variableName}" was not found`));
    }
    return dispatch(markEnvironmentVariableAsSecret(target));
  };

  /** Runs the warning link: plain values and scoped vars open the form, env vars are marked as secret directly. */
  const handleAction = (event) => {
    event.stopPropagation();
    if (scope === 'plaintext') {
      setForm({ name: '', value });
      return;
    }
    if (MOVE_SCOPES.includes(scope)) {
      const moved = findMovedVariable({ collection, item, variableName, variableUid, value });
      if (!moved) {
        close();
        toast.error(`"${variableName}" was not found`);
        return;
      }
      setForm({ name: variableName, value: moved.value, movedVariable: moved });
      return;
    }
    close();
    markAsSecret()
      .then(() => toast.success(`"${variableName}" is moved to Secrets`))
      .catch((error) => toast.error(error.message));
  };

  /** Adds the secret to the environment, then points the field to it and deletes the moved var. */
  const saveSecret = ({ name, value: secretValue, targetType }) => {
    if (!movedVariable && !onReplaceValue) {
      return Promise.reject(new Error('This field cannot be updated'));
    }

    const overridingScope = findOverridingVariableScope(name, {
      collection,
      item,
      targetScope: targetType,
      ignoreVariableUid: movedVariable?.uid
    });
    if (overridingScope) {
      return Promise.reject(new Error(`"${name}" already exists in ${SCOPE_LABELS[overridingScope]}. Use a different name.`));
    }

    return dispatch(addSecretToEnvironment({ collectionUid, environmentScope: targetType, name, value: secretValue }))
      .then(() => {
        if (!movedVariable) {
          onReplaceValue(`{{${name}}}`);
          return dispatch(saveRequestFolderOrCollection(collectionUid, item));
        }
        const isFieldRenamed = name !== variableName && !!onReplaceValue;
        if (isFieldRenamed) {
          onReplaceValue(renameVariableReference(value, variableName, name));
        }
        return dispatch(removeVariableFromScope({
          collectionUid,
          scope,
          ownerUid: movedVariable.ownerUid,
          variableUid: movedVariable.uid
        })).then(() => isFieldRenamed && dispatch(saveRequestFolderOrCollection(collectionUid, item)));
      })
      .then(() => toast.success(`Secret "${name}" created`));
  };

  const popoverContent = form ? (
    <SecretVariableForm
      collection={collection}
      sourceLabel={movedVariable ? SCOPE_LABELS[scope] : null}
      defaultName={form.name}
      defaultValue={form.value}
      onSave={saveSecret}
      onClose={close}
    />
  ) : (
    <WarningTooltip
      fieldName={fieldName}
      message={warningMessage}
      actionLabel={disabled ? null : ACTION_LABELS[scope]}
      onAction={handleAction}
    />
  );

  return (
    <StyledWrapper
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={() => setIsPinned(true)}
    >
      <Tippy
        visible={isOpen}
        interactive
        placement="bottom-start"
        arrow={false}
        animation={false}
        maxWidth="none"
        appendTo={() => document.body}
        onClickOutside={() => {
          if (!form) close();
        }}
        render={(attrs) => <div {...attrs}>{popoverContent}</div>}
      >
        <span className="mr-[4px] flex items-center" data-testid={`sensitive-field-warning-${fieldName}`}>
          <IconAlertTriangle className="tooltip-icon cursor-pointer" size={16} />
        </span>
      </Tippy>
    </StyledWrapper>
  );
};

export default SensitiveFieldWarning;
