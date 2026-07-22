import { uuid } from '../../common/index.js';
import type {
  Variable,
  BrunoVariable,
  BrunoVariables
} from '../types';
import {
  isTypedValue,
  hasTypedMetadata,
  toOpenCollectionTypedValue,
  fromOpenCollectionTypedValue,
  serializeVariableValue
} from './datatype';

interface BrunoVars {
  req: BrunoVariables;
  res: BrunoVariables;
}

export const fromOpenCollectionVariables = (variables: Variable[] | undefined): BrunoVars => {
  if (!variables?.length) {
    return { req: [], res: [] };
  }

  const reqVars: BrunoVariable[] = [];

  variables.forEach((v: Variable) => {
    const variable: BrunoVariable = {
      uid: uuid(),
      name: v.name || '',
      value: '',
      enabled: v.disabled !== true,
      local: false
    };

    if (isTypedValue(v.value)) {
      Object.assign(variable, fromOpenCollectionTypedValue(v.value));
    } else if (typeof v.value === 'string') {
      variable.value = v.value;
    }

    if (v.description) {
      variable.description = typeof v.description === 'string'
        ? v.description
        : (v.description as { content?: string })?.content || '';
    }

    reqVars.push(variable);
  });

  return { req: reqVars, res: [] };
};

export const toOpenCollectionVariables = (vars: BrunoVars | { req?: BrunoVariables; res?: BrunoVariables } | null | undefined): Variable[] | undefined => {
  // Handle folder variables (has req/res structure) - only use req vars
  const hasReqRes = vars && 'req' in vars;
  const reqVars = hasReqRes ? vars.req : vars as BrunoVariables;

  const reqVarsArray = Array.isArray(reqVars) ? reqVars : [];

  if (!reqVarsArray.length) {
    return undefined;
  }

  const ocVariables: Variable[] = reqVarsArray.map((v: BrunoVariable): Variable => {
    const valueStr = serializeVariableValue(v.value);
    const variable: Variable = {
      name: v.name || '',
      value: hasTypedMetadata(v) ? toOpenCollectionTypedValue(v, valueStr) : valueStr
    };

    if (v.description && typeof v.description === 'string' && v.description.trim().length) {
      variable.description = v.description;
    }

    if (v.enabled === false) {
      variable.disabled = true;
    }

    return variable;
  });

  return ocVariables.length > 0 ? ocVariables : undefined;
};
