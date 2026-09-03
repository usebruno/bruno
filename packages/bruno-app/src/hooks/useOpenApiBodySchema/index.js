import { useEffect, useState } from 'react';
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
  const contractType = contract?.type;
  const contractSource = contract?.source;
  const contractOperationId = contract?.operationId;
  const requestMethod = request?.method;
  const requestUrl = request?.url;
  const collectionUid = collection?.uid;
  const collectionPath = collection?.pathname;
  const activeEnvironmentUid = collection?.activeEnvironmentUid;
  const environments = collection?.environments;
  const runtimeVariables = collection?.runtimeVariables;
  const globalEnvironmentVariables = collection?.globalEnvironmentVariables;
  const [state, setState] = useState(initialState);

  useEffect(() => {
    if (!enabled || contractType !== 'openapi') {
      setState(initialState);
      return undefined;
    }

    let cancelled = false;
    const load = async () => {
      setState({ ...initialState, status: 'loading' });
      try {
        const ipcRenderer = window.ipcRenderer;
        if (!ipcRenderer) throw new Error('OpenAPI body contracts are only available in the desktop app');

        const source = contractSource || collectionSource;
        const activeContract = {
          type: contractType,
          source: contractSource,
          operationId: contractOperationId
        };
        let result;
        if (contractSource) {
          result = await ipcRenderer.invoke('renderer:fetch-openapi-spec', {
            collectionUid,
            collectionPath,
            requestPath,
            sourceUrl: contractSource,
            environmentContext: {
              activeEnvironmentUid,
              environments,
              runtimeVariables,
              globalEnvironmentVariables
            }
          });
        } else {
          result = await ipcRenderer.invoke('renderer:read-openapi-spec', {
            collectionPath
          });
          if (result?.error && source) {
            result = await ipcRenderer.invoke('renderer:fetch-openapi-spec', {
              collectionUid,
              collectionPath,
              sourceUrl: source,
              environmentContext: {
                activeEnvironmentUid,
                environments,
                runtimeVariables,
                globalEnvironmentVariables
              }
            });
          }
        }

        if (result?.error) throw new Error(result.error);
        if (!result?.content) throw new Error('OpenAPI specification was not found');

        const document = parseOpenApiDocument(result.content);
        const requestDescriptor = {
          method: requestMethod,
          url: requestUrl
        };
        const operations = listOpenApiOperations(document);

        try {
          const descriptor = resolveOpenApiOperation(document, activeContract, requestDescriptor);
          const operationDocument = createOpenApiOperationDocument(document, descriptor);

          try {
            const resolved = resolveOpenApiBodySchema(document, activeContract, requestDescriptor);
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
                error: error.message || 'Failed to load the OpenAPI body schema'
              });
            }
          }
        } catch (error) {
          if (!cancelled) {
            setState({
              ...initialState,
              operations,
              status: 'error',
              error: error.message || 'Failed to select the OpenAPI operation'
            });
          }
        }
      } catch (error) {
        if (!cancelled) {
          setState({ ...initialState, status: 'error', error: error.message || 'Failed to load the OpenAPI schema' });
        }
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [
    enabled,
    contractType,
    contractSource,
    contractOperationId,
    collectionSource,
    collectionUid,
    collectionPath,
    activeEnvironmentUid,
    environments,
    runtimeVariables,
    globalEnvironmentVariables,
    requestMethod,
    requestUrl,
    requestPath
  ]);

  return { ...state, contract };
};

export default useOpenApiBodySchema;
