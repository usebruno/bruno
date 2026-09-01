import React, { useEffect, useState } from 'react';
import { useDispatch } from 'react-redux';
import { IconFile, IconTrash } from '@tabler/icons';
import Button from 'ui/Button';
import Swagger from 'components/ApiSpecPanel/Renderers/Swagger';
import useOpenApiBodySchema from 'hooks/useOpenApiBodySchema';
import path, { getRelativePath } from 'utils/common/path';
import { updateRequestBodyContract } from 'providers/ReduxStore/slices/collections';
import { browseFiles, saveRequest } from 'providers/ReduxStore/slices/collections/actions';

const isHttpUrl = (value = '') => /^https?:\/\//i.test(value);

const OpenApiContract = ({ item, collection }) => {
  const dispatch = useDispatch();
  const request = item.draft?.request || item.request;
  const contract = request?.bodyContract;
  const requestPath = item.draft?.pathname || item.pathname;
  const requestDirectory = requestPath ? path.dirname(requestPath) : collection.pathname;
  const source = contract?.source || '';
  const sourceIsRemote = isHttpUrl(source);
  const [useAbsolutePath, setUseAbsolutePath] = useState(path.isAbsolute(source));
  const openApi = useOpenApiBodySchema({ item, collection, enabled: contract?.type === 'openapi' });

  useEffect(() => {
    setUseAbsolutePath(path.isAbsolute(source));
  }, [source]);

  const updateContract = (nextContract) => {
    dispatch(updateRequestBodyContract({
      collectionUid: collection.uid,
      itemUid: item.uid,
      contract: nextContract
    }));
  };

  const handleSelectFile = async () => {
    const filePaths = await dispatch(browseFiles([
      { name: 'OpenAPI specification', extensions: ['yaml', 'yml', 'json'] }
    ], []));
    const absolutePath = filePaths?.[0];
    if (!absolutePath) return;

    updateContract({
      type: 'openapi',
      source: useAbsolutePath ? absolutePath : getRelativePath(requestDirectory, absolutePath, true),
      operationId: null
    });
  };

  const handlePathModeChange = async (event) => {
    const nextUseAbsolutePath = event.target.checked;
    setUseAbsolutePath(nextUseAbsolutePath);
    if (!source || sourceIsRemote) return;

    const nextSource = nextUseAbsolutePath
      ? await window.ipcRenderer.invoke('renderer:resolve-path', source, requestDirectory)
      : getRelativePath(requestDirectory, source, true);

    updateContract({ ...contract, source: nextSource });
  };

  const handleOperationChange = (event) => {
    updateContract({
      ...contract,
      type: 'openapi',
      operationId: event.target.value || null
    });
  };

  const handleRemove = () => {
    updateContract(null);
    dispatch(saveRequest(item.uid, collection.uid));
  };
  const handleSave = () => dispatch(saveRequest(item.uid, collection.uid));

  return (
    <div className="flex flex-col h-full min-h-0 w-full" data-testid="openapi-contract-tab">
      <div className="flex flex-wrap items-end gap-3 px-4 pb-4">
        <div className="flex flex-col gap-1 min-w-0 flex-grow">
          <label className="text-xs font-medium" htmlFor="openapi-contract-source">OpenAPI specification</label>
          <input
            id="openapi-contract-source"
            className="w-full px-3 py-2 border rounded bg-transparent text-sm"
            value={source}
            placeholder="Select an OpenAPI YAML or JSON file"
            readOnly
            title={source || undefined}
          />
        </div>
        <Button
          size="sm"
          variant="outline"
          icon={<IconFile size={14} strokeWidth={1.5} />}
          onClick={handleSelectFile}
          data-testid="openapi-select-file"
        >
          Select file
        </Button>
        <label className={`flex items-center gap-2 pb-2 text-xs ${sourceIsRemote ? 'opacity-50' : ''}`}>
          <input
            type="checkbox"
            checked={useAbsolutePath}
            onChange={handlePathModeChange}
            disabled={sourceIsRemote}
            className="h-4 w-4"
            data-testid="openapi-absolute-path"
          />
          Use absolute path
        </label>
      </div>

      <div className="flex flex-wrap items-end gap-3 px-4 pb-4">
        <div className="flex flex-col gap-1 min-w-0 flex-grow">
          <label className="text-xs font-medium" htmlFor="openapi-contract-operation">Operation</label>
          <select
            id="openapi-contract-operation"
            className="w-full px-3 py-2 border rounded bg-transparent text-sm"
            value={contract?.operationId || ''}
            onChange={handleOperationChange}
            disabled={!source || openApi.status === 'loading'}
            data-testid="openapi-operation-select"
          >
            <option value="">Select an operation</option>
            {openApi.operations.map((operation) => (
              <option
                key={`${operation.method}:${operation.path}`}
                value={operation.operationId || ''}
                disabled={!operation.operationId}
              >
                {`${operation.method.toUpperCase()} ${operation.path}${operation.operationId ? ` — ${operation.operationId}` : ' — operationId is missing'}${operation.summary ? ` — ${operation.summary}` : ''}`}
              </option>
            ))}
          </select>
        </div>
        <Button
          size="sm"
          onClick={handleSave}
          disabled={!source || !contract?.operationId || openApi.status !== 'ready'}
          data-testid="openapi-contract-save"
        >
          Save
        </Button>
        {contract?.type === 'openapi' && (
          <Button
            size="sm"
            variant="outline"
            color="danger"
            icon={<IconTrash size={14} strokeWidth={1.5} />}
            onClick={handleRemove}
            data-testid="openapi-contract-remove"
          >
            Remove
          </Button>
        )}
      </div>

      {openApi.status === 'loading' && (
        <div className="flex flex-1 items-center justify-center text-sm opacity-60">Loading OpenAPI specification…</div>
      )}
      {openApi.status === 'error' && (
        <div className="mx-4 mb-3 px-3 py-2 text-xs text-danger border rounded" data-testid="openapi-contract-error">
          {openApi.error}
        </div>
      )}
      {!source && (
        <div className="flex flex-1 items-center justify-center text-sm opacity-60">
          Select a specification and an operation to view the linked OpenAPI fragment.
        </div>
      )}
      {openApi.operationDocument && (
        <div className="flex-1 min-h-0 overflow-auto border-t" data-testid="openapi-operation-preview">
          <Swagger spec={openApi.operationDocument} />
        </div>
      )}
    </div>
  );
};

export default OpenApiContract;
