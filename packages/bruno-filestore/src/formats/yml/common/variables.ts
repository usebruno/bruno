import { Variable, VariableTypedValue } from '@opencollection/types/common/variables';
import { FolderRequest as BrunoFolderRequest } from '@usebruno/schema-types/collection/folder';
import { Variable as BrunoVariable, Variables as BrunoVariables } from '@usebruno/schema-types/common/variables';
import { uuid, ensureString } from '../../../utils';
import {
  isTypedValue,
  hasTypedMetadata,
  toOpenCollectionTypedValue,
  fromOpenCollectionTypedValue,
  serializeVariableValue
} from './datatype';

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
    const valueStr = serializeVariableValue(v.value);
    // OpenCollection has no dedicated field for Bruno's `local` flag, so we reuse the
    // same leading-`@` marker the .bru grammar uses. Always prepend when local — even if
    // the raw name already starts with `@`, so that reading the marker back (strip one
    // `@`) is lossless: `@@foo` reads as name=`@foo`, local=true, matching bruToJson.
    const rawName = v.name || '';
    const serializedName = v.local === true ? `@${rawName}` : rawName;
    const variable: Variable = {
      name: serializedName,
      value: hasTypedMetadata(v) ? toOpenCollectionTypedValue(v, valueStr) : valueStr
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
    const rawName = ensureString(v.name);
    const isLocal = rawName.length > 0 && rawName.charAt(0) === '@';
    const base: BrunoVariable = {
      uid: uuid(),
      name: isLocal ? rawName.slice(1) : rawName,
      value: '',
      enabled: v.disabled !== true,
      local: isLocal
    };

    if (isTypedValue(v.value)) {
      Object.assign(base, fromOpenCollectionTypedValue(v.value));
    } else {
      base.value = ensureString(v.value);
    }

    if (v.description) {
      base.description = typeof v.description === 'string' ? v.description : (v.description as any)?.content || '';
    }

    reqVars.push(base);
  });

  return { req: reqVars, res: [] };
};
