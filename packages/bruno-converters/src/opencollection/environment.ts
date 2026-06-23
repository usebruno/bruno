import { uuid } from '../common/index.js';
import {
  isTypedValue,
  hasTypedMetadata,
  toOpenCollectionTypedValue,
  fromOpenCollectionTypedValue,
  serializeVariableValue
} from './common/datatype';
import type {
  Environment,
  Variable,
  BrunoEnvironment,
  BrunoEnvironmentVariable
} from './types';

interface OCVariable extends Omit<Variable, 'value'> {
  name: string;
  value?: string | { type: string; data: unknown };
  secret?: boolean;
  disabled?: boolean;
}

export const fromOpenCollectionEnvironments = (environments: Environment[] | undefined): BrunoEnvironment[] => {
  if (!environments?.length) {
    return [];
  }

  return environments.map((env): BrunoEnvironment => ({
    uid: uuid(),
    name: env.name || 'Untitled Environment',
    variables: (env.variables || []).map((v): BrunoEnvironmentVariable => {
      const variable = v as OCVariable;
      const isSecret = variable.secret === true;

      const result: BrunoEnvironmentVariable = {
        uid: uuid(),
        name: variable.name || '',
        value: '',
        type: 'text',
        enabled: variable.disabled !== true,
        secret: isSecret
      };

      if (isSecret) {
        // Secret values are not present in the source; never carry a dataType.
        return result;
      }

      if (variable.value === undefined) {
        return result;
      }

      if (isTypedValue(variable.value)) {
        Object.assign(result, fromOpenCollectionTypedValue(variable.value));
      } else if (typeof variable.value === 'string') {
        result.value = variable.value;
      }

      return result;
    }),
    color: env.color || null
  }));
};

export const toOpenCollectionEnvironments = (environments: BrunoEnvironment[] | undefined): Environment[] | undefined => {
  if (!environments?.length) {
    return undefined;
  }

  return environments.map((env): Environment => {
    const ocEnv: Environment = {
      name: env.name || 'Untitled Environment',
      color: env.color ?? undefined,
      variables: (env.variables || []).map((v): OCVariable => {
        const ocVar: OCVariable = { name: v.name || '' };

        if (v.secret) {
          ocVar.secret = true;
          // Secret variables don't include the value in export.
        } else {
          const valueStr = serializeVariableValue(v.value);
          ocVar.value = hasTypedMetadata(v) ? toOpenCollectionTypedValue(v, valueStr) : valueStr;
        }

        if (v.enabled === false) {
          ocVar.disabled = true;
        }

        return ocVar;
      }) as Variable[]
    };

    return ocEnv;
  });
};
