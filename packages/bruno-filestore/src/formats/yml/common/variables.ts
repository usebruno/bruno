import { Variable } from '@opencollection/types/common/variables';
import { FolderRequest as BrunoFolderRequest } from '@usebruno/schema-types/collection/folder';
import { Variable as BrunoVariable, Variables as BrunoVariables } from '@usebruno/schema-types/common/variables';
import { uuid } from '../../../utils';

export const toOpenCollectionVariables = (variables: BrunoFolderRequest['vars'] | BrunoVariables | null | undefined): Variable[] | undefined => {
  // Handle folder variables (has req/res structure)
  const hasReqRes = variables && 'req' in variables;
  const reqVars = hasReqRes ? variables.req : variables as BrunoVariables;
  const resVars = hasReqRes && 'res' in variables ? variables.res : [];

  const reqVarsArray = Array.isArray(reqVars) ? reqVars : [];
  const resVarsArray = Array.isArray(resVars) ? resVars : [];

  const allVars = [...reqVarsArray, ...resVarsArray];

  if (!allVars.length) {
    return undefined;
  }

  const ocVariables: Variable[] = allVars.map((v: BrunoVariable, index: number): Variable => {
    const isResVar = index >= reqVarsArray.length;
    const variable: Variable = {
      name: v.name || '',
      value: v.value || ''
    };

    if (isResVar) {
      const scopeMarker = '[post-response]';
      if (v?.description?.trim().length) {
        variable.description = `${scopeMarker} ${v.description}`;
      } else {
        variable.description = scopeMarker;
      }
    } else if (v?.description?.trim().length) {
      variable.description = v.description;
    }

    if (v.enabled === false) {
      variable.disabled = true;
    }
    return variable;
  });

  return ocVariables.length > 0 ? ocVariables : undefined;
};

export const toBrunoVariables = (variables: Variable[] | null | undefined): { req: BrunoVariables; res: BrunoVariables } => {
  if (!variables?.length) {
    return { req: [], res: [] };
  }

  const scopeMarker = '[post-response]';
  const reqVars: BrunoVariables = [];
  const resVars: BrunoVariables = [];

  variables.forEach((v: Variable) => {
    const isPostResponse = typeof v.description === 'string' && v.description.startsWith(scopeMarker);

    const variable: BrunoVariable = {
      uid: uuid(),
      name: v.name || '',
      value: v.value as string || '',
      enabled: v.disabled !== true,
      local: false
    };

    if (isPostResponse) {
      const cleanDesc = (v.description as string).substring(scopeMarker.length).trim();
      if (cleanDesc) {
        variable.description = cleanDesc;
      }
      resVars.push(variable);
    } else {
      if (v.description) {
        variable.description = typeof v.description === 'string' ? v.description : (v.description as any)?.content || '';
      }
      reqVars.push(variable);
    }
  });

  return { req: reqVars, res: resVars };
};
