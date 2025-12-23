import { uuid } from '../../common/index.js';
import type {
  OCVariable,
  BrunoVariable,
  BrunoVariables
} from '../types';

interface BrunoVars {
  req: BrunoVariables;
  res: BrunoVariables;
}

export const fromOpenCollectionVariables = (variables: OCVariable[] | undefined): BrunoVars => {
  if (!variables?.length) {
    return { req: [], res: [] };
  }

  const scopeMarker = '[post-response]';
  const reqVars: BrunoVariable[] = [];
  const resVars: BrunoVariable[] = [];

  variables.forEach((v: OCVariable) => {
    let value = '';
    if (typeof v.value === 'string') {
      value = v.value;
    } else if (v.value && typeof v.value === 'object' && 'data' in v.value) {
      value = (v.value as { data: string }).data || '';
    }

    const isPostResponse = typeof v.description === 'string' && v.description.startsWith(scopeMarker);

    const variable: BrunoVariable = {
      uid: uuid(),
      name: v.name || '',
      value,
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
        variable.description = typeof v.description === 'string' ? v.description : (v.description as { content?: string })?.content || null;
      }
      reqVars.push(variable);
    }
  });

  return { req: reqVars, res: resVars };
};

export const toOpenCollectionVariables = (vars: BrunoVars | { req?: BrunoVariables; res?: BrunoVariables } | null | undefined): OCVariable[] | undefined => {
  const reqVars = vars?.req || [];
  const resVars = vars?.res || [];

  const allVars: OCVariable[] = [];
  const scopeMarker = '[post-response]';

  // Add request variables
  if (Array.isArray(reqVars)) {
    reqVars.forEach((v: BrunoVariable) => {
      const ocVar: OCVariable = {
        name: v.name || '',
        value: v.value || ''
      };

      if (v.description && typeof v.description === 'string' && v.description.trim().length) {
        ocVar.description = v.description;
      }

      if (v.enabled === false) {
        ocVar.disabled = true;
      }

      allVars.push(ocVar);
    });
  }

  // Add response variables with scope marker
  if (Array.isArray(resVars)) {
    resVars.forEach((v: BrunoVariable) => {
      const ocVar: OCVariable = {
        name: v.name || '',
        value: v.value || ''
      };

      if (v.description && typeof v.description === 'string' && v.description.trim().length) {
        ocVar.description = `${scopeMarker} ${v.description}`;
      } else {
        ocVar.description = scopeMarker;
      }

      if (v.enabled === false) {
        ocVar.disabled = true;
      }

      allVars.push(ocVar);
    });
  }

  return allVars.length > 0 ? allVars : undefined;
};
