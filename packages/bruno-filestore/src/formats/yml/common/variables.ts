import { Variable } from '@opencollection/types/common/variables';
import { FolderRequest as BrunoFolderRequest } from '@usebruno/schema-types/collection/folder';
import { Variable as BrunoVariable, Variables as BrunoVariables } from '@usebruno/schema-types/common/variables';
import { uuid, ensureString } from '../../../utils';

/**
 * Convert Bruno pre-request variables to OpenCollection variables format.
 * Note: Post-response variables are now converted to actions (see actions.ts).
 */
export const toOpenCollectionVariables = (variables: BrunoFolderRequest['vars'] | BrunoVariables | null | undefined): Variable[] | undefined => {
  // Handle folder variables (has req/res structure) - only use req vars
  const hasReqRes = variables && 'req' in variables;
  const reqVars = hasReqRes ? variables.req : variables as BrunoVariables;

  const reqVarsArray = Array.isArray(reqVars) ? reqVars : [];

  if (!reqVarsArray.length) {
    return undefined;
  }

  const ocVariables: Variable[] = reqVarsArray.map((v: BrunoVariable): Variable => {
    const variable: Variable = {
      name: v.name || '',
      value: v.value || ''
    };

    if (v?.description?.trim().length) {
      variable.description = v.description;
    }

    if (v.enabled === false) {
      variable.disabled = true;
    }
    return variable;
  });

  return ocVariables.length > 0 ? ocVariables : undefined;
};

/**
 * Convert OpenCollection variables to Bruno pre-request variables format.
 * Note: Post-response variables come from actions (see actions.ts).
 */
export const toBrunoVariables = (variables: Variable[] | null | undefined): { req: BrunoVariables; res: BrunoVariables } => {
  if (!variables?.length) {
    return { req: [], res: [] };
  }

  const reqVars: BrunoVariables = [];

  variables.forEach((v: Variable) => {
    const variable: BrunoVariable = {
      uid: uuid(),
      name: ensureString(v.name),
      value: ensureString(v.value),
      enabled: v.disabled !== true,
      local: false
    };

    if (v.description) {
      variable.description = typeof v.description === 'string' ? v.description : (v.description as any)?.content || '';
    }

    reqVars.push(variable);
  });

  return { req: reqVars, res: [] };
};
