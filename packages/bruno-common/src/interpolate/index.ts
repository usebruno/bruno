import { flattenObject } from '../utils';

type T_Variables = {
  processEnvVars?: Record<string, any>;
  envVars?: Record<string, any>;
  collectionVariables?: Record<string, any>;
  folderVariables?: Record<string, any>[];
  requestVariables?: Record<string, any>;
  runtimeVariables?: Record<string, any>;
};

type T_VariablesEnumerated = {
  processEnvVars?: Record<string, any>;
  envVars?: Record<string, any>;
  collectionVariables?: Record<string, any>;
  [key: `folderVariables${number}`]: Record<string, any>;
  requestVariables?: Record<string, any>;
  runtimeVariables?: Record<string, any>;
};

const interpolate = (str: string, variables: T_Variables): string => {
  if (
    !str ||
    typeof str !== 'string' ||
    !variables ||
    typeof variables !== 'object' ||
    !Object.keys(variables || {})?.length
  ) {
    return str;
  }

  let { folderVariables = [], ...enumeratedVariables } = variables;
  enumeratedVariables = {
    ...enumeratedVariables,
    ...folderVariables?.reduce((acc: Record<string, any>, fv: Record<string, any>, idx: number) => {
      acc[`folderVariables${idx}`] = fv;
      return acc;
    }, {})
  };

  let variableGroupPrecedenceOrder = [
    'processEnvVars',
    'envVars',
    'collectionVariables',
    ...(folderVariables?.map((_: Record<string, any>, idx: number) => `folderVariables${idx}`) || []),
    'requestVariables',
    'runtimeVariables'
  ];

  const allowedVariableGroupsForInterpolation: Record<string, string[]> = {
    processEnvVars: [],
    envVars: ['processEnvVars'],
    collectionVariables: ['processEnvVars', 'envVars', 'runtimeVariables'],
    ...folderVariables?.reduce((acc: Record<string, any>, fv: Record<string, any>, idx: number) => {
      acc[`folderVariables${idx}`] = [
        'processEnvVars',
        'envVars',
        'collectionVariables',
        ...Array.from({ length: idx })?.map((_, jdx) => `folderVariables${jdx}`),
        'runtimeVariables'
      ];
      return acc;
    }, {}),
    requestVariables: [
      'processEnvVars',
      'envVars',
      'collectionVariables',
      ...(folderVariables?.map((_: Record<string, any>, idx: number) => `folderVariables${idx}`) || []),
      'runtimeVariables'
    ],
    runtimeVariables: [
      'processEnvVars',
      'envVars',
      'collectionVariables',
      ...(folderVariables?.map((_: Record<string, any>, idx: number) => `folderVariables${idx}`) || []),
      'requestVariables'
    ]
  };

  const getVariableGroupsBasedonPrecedence = (variables: T_VariablesEnumerated, str: string) => {
    const variableGroupKeyIndex = Object.entries(variables)?.findIndex(([key, value]) => {
      return value && typeof value === 'object' && Object.keys(flattenObject(value))?.includes(str) ? key : false;
    });

    const variableGroupKey = Object.entries(variables)?.[variableGroupKeyIndex]?.[0] as keyof T_VariablesEnumerated;

    return (
      allowedVariableGroupsForInterpolation?.[variableGroupKey]?.reduce(
        (acc: Record<string, any>, k: string) => {
          let key = k as keyof T_VariablesEnumerated;
          if (variables[key]) {
            acc[key] = variables[key];
          }
          return acc;
        },
        {
          [variableGroupKey]: variables[variableGroupKey]
        }
      ) || {}
    );
  };

  const flattenVariableGroups = (variables: T_VariablesEnumerated): Record<string, any> => {
    let _variables = variableGroupPrecedenceOrder
      ?.map((k) => {
        let key = k as keyof T_VariablesEnumerated;
        return variables[key] || {};
      })
      ?.reduce((acc, v) => {
        acc = {
          ...acc,
          ...v
        };
        return acc;
      }, {});
    return flattenObject(_variables);
  };

  const replace = (
    str: string,
    variables: T_VariablesEnumerated,
    visited = new Set<String>(),
    results = new Map<string, string>()
  ): string => {
    const patternRegex = /\{\{([^}]+)\}\}/g;

    return str.replace(patternRegex, (match, placeholder: string) => {
      const relevantVariableGroups = getVariableGroupsBasedonPrecedence(variables, placeholder);
      const flattenedVariableGroups = flattenVariableGroups(relevantVariableGroups);

      if (results.has(match)) {
        return results.get(match);
      }

      const replacement = flattenedVariableGroups[placeholder];

      if (replacement === undefined) {
        return match; // No replacement found, return the original match
      }
      patternRegex.lastIndex = 0;
      if (patternRegex.test(replacement) && !visited.has(match)) {
        visited.add(match);
        const result = replace(replacement, relevantVariableGroups, visited, results);
        results.set(match, result);
        visited.delete(placeholder);
        return result;
      }

      // visited.add(match);
      const result = replacement !== undefined ? replacement : match;
      results.set(match, result);

      return result;
    });
  };

  return replace(str, enumeratedVariables);
};

export default interpolate;
