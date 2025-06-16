import get from 'lodash/get';
import { HTTPSnippet } from 'httpsnippet';
import { buildHarRequest } from 'utils/codegenerator/har';
import { getAllVariables } from 'utils/collections/index';
import { getAuthHeaders } from 'utils/codegenerator/auth';
import { cloneDeep } from 'lodash';
import {
  interpolateHeaders,
  interpolateBody,
  createVariablesObject
} from './interpolation';


export const generateSnippet = ({ language, item, collection, shouldInterpolate }) => {
  try {
    const localCollection = cloneDeep(collection);

    const collectionRootAuth = localCollection?.root?.request?.auth;
    const requestAuth = item.draft ? get(item, 'draft.request.auth') : get(item, 'request.auth');

    const requestHeaders = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');

    const headers = [
      ...getAuthHeaders(collectionRootAuth, requestAuth),
      ...(localCollection?.root?.request?.headers || []),
      ...(requestHeaders || [])
    ];

    const collectionVars = (() => {
      const collectionRequestVars = get(localCollection, 'root.request.vars.req', []);
      return collectionRequestVars.reduce((acc, variable) => {
        if (variable.enabled) {
          acc[variable.name] = variable.value;
        }
        return acc;
      }, {});
    })();

    const varsAll = (() => {
      const vars = getAllVariables(localCollection, item);
      const { process, ...restVars } = vars;
      return {
        ...restVars,
        ...collectionVars
      };
    })();

    const variablesForInterpolation = createVariablesObject({
      globalEnvironmentVariables: localCollection.globalEnvironmentVariables || {},
      allVariables: varsAll,
      collectionVars,
      collection: localCollection,
      runtimeVariables: localCollection.runtimeVariables || {},
      processEnvVars: localCollection.processEnvVariables || {}
    });

    const finalHeaders = shouldInterpolate ? interpolateHeaders(headers, variablesForInterpolation) : headers;

    const bodyOriginal = item.draft?.request?.body || item.request?.body;
    const finalBody = shouldInterpolate ? interpolateBody(bodyOriginal, variablesForInterpolation) : bodyOriginal;

    const snippet = new HTTPSnippet(
      buildHarRequest({
        request: {
          ...item.request,
          body: finalBody
        },
        headers: finalHeaders,
        type: item.type
      })
    ).convert(language.target, language.client);

    return snippet || '';
  } catch (e) {
    console.error(e);
    return 'Error generating code snippet';
  }
}; 