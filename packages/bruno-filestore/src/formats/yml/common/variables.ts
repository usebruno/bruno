import { Variable } from "@opencollection/types/common/variables";
import { FolderRequest as BrunoFolderRequest } from "@usebruno/schema-types/collection/folder";
import { Variable as BrunoVariable, Variables as BrunoVariables } from "@usebruno/schema-types/common/variables";
import { uuid } from '../../../utils';

export const toOpenCollectionVariables = (
  variables: BrunoFolderRequest['vars'] | BrunoVariables | null | undefined
): Variable[] | undefined => {
  // Handle folder variables (has req/res structure)
  const varsArray = variables && 'req' in variables ? variables.req : variables as BrunoVariables;

  if (!varsArray?.length) {
    return undefined;
  }

  const ocVariables: Variable[] = varsArray.map((v: BrunoVariable): Variable => {
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

export const toBrunoVariables = (variables: Variable[] | null | undefined): BrunoVariables | undefined => {
  if (!variables?.length) {
    return undefined;
  }

  const brunoVariables: BrunoVariables = variables.map((v: Variable): BrunoVariable => {
    const variable: BrunoVariable = {
      uid: uuid(),
      name: v.name || '',
      value: v.value as string || '',
      enabled: v.disabled !== true,
      local: false
    };

    return variable;
  });

  return brunoVariables.length > 0 ? brunoVariables : undefined;
};