import type { Action, ActionSetVariable, ActionVariableScope } from '@opencollection/types/common/actions';
import type { Variable as BrunoVariable, Variables as BrunoVariables } from '@usebruno/schema-types/common/variables';
import { uuid, ensureString } from '../../../utils';

/**
 * Convert Bruno post-response variables to OpenCollection actions.
 * Post-response variables in Bruno are converted to 'set-variable' actions
 * with phase 'after-response'.
 */
export const toOpenCollectionActions = (resVariables: BrunoVariables | null | undefined): Action[] | undefined => {
  if (!resVariables?.length) {
    return undefined;
  }

  const actions: Action[] = resVariables.map((v: BrunoVariable): ActionSetVariable => {
    const action: ActionSetVariable = {
      type: 'set-variable',
      phase: 'after-response',
      selector: {
        expression: v.value || '',
        method: 'jsonq'
      },
      variable: {
        name: v.name || '',
        scope: v.local ? 'request' : 'runtime' as ActionVariableScope
      }
    };

    if (v.description?.trim().length) {
      action.description = v.description;
    }

    if (v.enabled === false) {
      action.disabled = true;
    }

    return action;
  });

  return actions.length > 0 ? actions : undefined;
};

/**
 * Convert OpenCollection actions to Bruno post-response variables.
 * Only 'set-variable' actions with phase 'after-response' are converted.
 */
export const toBrunoPostResponseVariables = (actions: Action[] | null | undefined): BrunoVariables => {
  if (!actions?.length) {
    return [];
  }

  const resVars: BrunoVariables = [];

  actions.forEach((action: Action) => {
    // Only process 'set-variable' actions with 'after-response' phase
    if (action.type === 'set-variable' && action.phase === 'after-response') {
      const setVarAction = action as ActionSetVariable;

      const variable: BrunoVariable = {
        uid: uuid(),
        name: ensureString(setVarAction.variable?.name),
        value: ensureString(setVarAction.selector?.expression),
        enabled: setVarAction.disabled !== true,
        local: false
      };

      if (setVarAction.description) {
        variable.description = typeof setVarAction.description === 'string'
          ? setVarAction.description
          : (setVarAction.description as any)?.content || '';
      }

      resVars.push(variable);
    }
  });

  return resVars;
};
