import { useEffect, useMemo, useState } from 'react';
import get from 'lodash/get';
import {
  createOpenApiOperationDocument,
  listOpenApiOperations,
  parseOpenApiDocument,
  resolveOpenApiBodySchema,
  resolveOpenApiOperation
} from 'utils/openapi/body-schema';

const initialState = {
  schema: null,
  status: 'idle',
  error: null,
  operationId: null,
  contentType: null,
  operations: [],
  operationDocument: null
};

const useOpenApiBodySchema = ({ item, collection, enabled }) => {
  const request = item?.draft?.request || item?.request;
  const contract = request?.bodyContract;
  const requestPath = item?.draft?.pathname || item?.pathname;
  const collectionSource = get(collection, 'brunoConfig.openapi[0].sourceUrl', null);
  const contractKey = useMemo(() => JSON.stringify({
    source: contract?.source || collectionSource,
    operationId: contract?.operationId || item?.name,
    method: request?.method,
    url: request?.url,
    requestPath
  }), [contract?.source, contract?.operationId, collectionSource, item?.name, request?.method, request?.url, requestPath]);
  const [state, setState] = useState(initialState);

  useEffect(() => {
    if (!enabled || contract?.type !== 'openapi') {
      setState(initialState);
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setState({ ...initialState, status: 'loading' });
      try {
        const ipcRenderer = window.ipcRenderer;
        if (!ipcRenderer) throw new Error('OpenAPI body contracts доступны только в desktop-приложении');

        const source = contract.source || collectionSource;
        let result;
        if (contract.source) {
          result = await ipcRenderer.invoke('renderer:fetch-openapi-spec', {
            collectionUid: collection.uid,
            collectionPath: collection.pathname,
            requestPath,
            sourceUrl: contract.source,
            environmentContext: {
              activeEnvironmentUid: collection.activeEnvironmentUid,
              environments: collection.environments,
              runtimeVariables: collection.runtimeVariables,
              globalEnvironmentVariables: collection.globalEnvironmentVariables
            }
          });
        } else {
          result = await ipcRenderer.invoke('renderer:read-openapi-spec', {
            collectionPath: collection.pathname
          });
          if (result.error && source) {
            result = await ipcRenderer.invoke('renderer:fetch-openapi-spec', {
              collectionUid: collection.uid,
              collectionPath: collection.pathname,
              sourceUrl: source,
              environmentContext: {
                activeEnvironmentUid: collection.activeEnvironmentUid,
                environments: collection.environments,
                runtimeVariables: collection.runtimeVariables,
                globalEnvironmentVariables: collection.globalEnvironmentVariables
              }
            });
          }
        }

        if (result?.error) throw new Error(result.error);
        if (!result?.content) throw new Error('OpenAPI specification не найдена');

        const document = parseOpenApiDocument(result.content);
        const requestDescriptor = {
          name: item.name,
          method: request.method,
          url: request.url
        };
        const operations = listOpenApiOperations(document);

        try {
          const descriptor = resolveOpenApiOperation(document, contract, requestDescriptor);
          const operationDocument = createOpenApiOperationDocument(document, descriptor);

          try {
            const resolved = resolveOpenApiBodySchema(document, contract, requestDescriptor);
            if (!cancelled) {
              setState({
                ...resolved,
                operations,
                operationDocument,
                status: 'ready',
                error: null
              });
            }
          } catch (error) {
            if (!cancelled) {
              setState({
                ...initialState,
                operations,
                operationId: descriptor.operation.operationId || null,
                operationDocument,
                status: 'error',
                error: error.message || 'Не удалось загрузить OpenAPI body schema'
              });
            }
          }
        } catch (error) {
          if (!cancelled) {
            setState({
              ...initialState,
              operations,
              status: 'error',
              error: error.message || 'Не удалось выбрать OpenAPI operation'
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setState({ ...initialState, status: 'error', error: error.message || 'Не удалось загрузить OpenAPI schema' });
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [enabled, contract?.type, contractKey, collection?.uid, collection?.pathname, requestPath]);

  return { ...state, contract };
};

export default useOpenApiBodySchema;
