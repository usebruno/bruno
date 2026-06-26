import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import get from 'lodash/get';
import debounce from 'lodash/debounce';
import { v4 as uuid } from 'uuid';
import { useFormik } from 'formik';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { IconPlus, IconSettings, IconTerminal2 } from '@tabler/icons';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import ToggleSwitch from 'components/ToggleSwitch';
import { clearAiApiKey, getAiStatus } from 'utils/ai';
import ProviderCard from './ProviderCard';
import CompatEndpointCard from './CompatEndpointCard';
import AutocompletePane from './AutocompletePane';
import StyledWrapper from './StyledWrapper';

const OPENAI_COMPATIBLE_PREFIX = 'openai-compatible:';
const isCompatProviderId = (id) => typeof id === 'string' && id.startsWith(OPENAI_COMPATIBLE_PREFIX);

const aiPreferencesSchema = Yup.object().shape({
  enabled: Yup.boolean(),
  providers: Yup.object(),
  models: Yup.object(),
  defaultModel: Yup.string().max(200).nullable(),
  openaiCompatibleEndpoints: Yup.array().of(
    Yup.object().shape({
      id: Yup.string().required(),
      name: Yup.string().max(120).nullable(),
      baseURL: Yup.string().max(2048).nullable(),
      models: Yup.array().of(
        Yup.object().shape({
          id: Yup.string().required(),
          label: Yup.string().max(120).nullable(),
          modelId: Yup.string().max(200).nullable()
        })
      )
    })
  ),
  autocomplete: Yup.object().shape({
    enabled: Yup.boolean(),
    model: Yup.string().max(200).nullable(),
    triggerMode: Yup.string().oneOf(['aggressive', 'debounced', 'manual']).nullable()
  })
});

const AI = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [activeTab, setActiveTab] = useState('config');

  const refreshStatus = useCallback(async () => {
    try {
      const next = await getAiStatus();
      setStatus(next);
      setStatusError(null);
    } catch (err) {
      setStatusError(err.message || 'Failed to load AI status');
    }
  }, []);

  useEffect(() => {
    refreshStatus();
  }, [refreshStatus]);

  const providerIds = status ? Object.keys(status.providers) : [];

  const formik = useFormik({
    enableReinitialize: true,
    initialValues: {
      enabled: get(preferences, 'ai.enabled', false),
      providers: providerIds.reduce((acc, id) => {
        acc[id] = { enabled: get(preferences, `ai.providers.${id}.enabled`, false) };
        return acc;
      }, {}),
      models: get(preferences, 'ai.models', {}),
      defaultModel: get(preferences, 'ai.defaultModel', ''),
      openaiCompatibleEndpoints: get(preferences, 'ai.openaiCompatibleEndpoints', []),
      autocomplete: {
        enabled: get(preferences, 'ai.autocomplete.enabled', true),
        model: get(preferences, 'ai.autocomplete.model', ''),
        triggerMode: get(preferences, 'ai.autocomplete.triggerMode', 'debounced')
      }
    },
    validationSchema: aiPreferencesSchema,
    onSubmit: () => {}
  });

  const handleSave = useCallback(
    (values) =>
      dispatch(
        savePreferences({
          ...preferences,
          ai: {
            enabled: values.enabled,
            providers: values.providers,
            models: values.models,
            defaultModel: values.defaultModel || '',
            openaiCompatibleEndpoints: values.openaiCompatibleEndpoints || [],
            autocomplete: {
              enabled: values.autocomplete?.enabled !== false,
              model: values.autocomplete?.model || '',
              triggerMode: values.autocomplete?.triggerMode || 'debounced'
            }
          }
        })
      )
        .then(() => refreshStatus())
        .catch((err) => {
          console.error('Failed to save AI preferences:', err);
          toast.error('Failed to save AI preferences');
          throw err;
        }),
    [dispatch, preferences, refreshStatus]
  );

  const handleSaveRef = useRef(handleSave);
  handleSaveRef.current = handleSave;

  const debouncedSave = useCallback(
    debounce((values) => {
      aiPreferencesSchema
        .validate(values, { abortEarly: true })
        .then((validated) => handleSaveRef.current(validated))
        .catch(() => {});
    }, 400),
    []
  );

  useEffect(() => {
    if (formik.dirty && formik.isValid) {
      debouncedSave(formik.values);
    }
  }, [formik.values, formik.dirty, formik.isValid, debouncedSave]);

  useEffect(() => () => debouncedSave.flush(), [debouncedSave]);

  const modelsByProvider = useMemo(() => {
    const grouped = {};
    (status?.models || []).forEach((model) => {
      if (!grouped[model.provider]) grouped[model.provider] = [];
      grouped[model.provider].push(model);
    });
    return grouped;
  }, [status]);

  const isModelEnabled = (modelId) => get(formik.values, `models.${modelId}.enabled`, true);

  const handleToggleModel = (modelId, next) => {
    formik.setFieldValue(`models.${modelId}.enabled`, next);
  };

  const endpoints = formik.values.openaiCompatibleEndpoints || [];

  const handleAddEndpoint = async () => {
    const newEndpoint = {
      id: uuid(),
      name: `Endpoint ${endpoints.length + 1}`,
      baseURL: '',
      models: []
    };
    const next = [...endpoints, newEndpoint];
    formik.setFieldValue('openaiCompatibleEndpoints', next);
    formik.setFieldValue(`providers.${OPENAI_COMPATIBLE_PREFIX}${newEndpoint.id}.enabled`, true);
    // Persist immediately so the backend recognises the new virtual provider id
    // by the time the user enters an API key. The card derives a `pending` flag
    // from `status.providers` so its key/test actions stay disabled until this
    // resolves, which also closes the race with debouncedSave.
    try {
      await handleSaveRef.current({
        ...formik.values,
        openaiCompatibleEndpoints: next,
        providers: {
          ...formik.values.providers,
          [`${OPENAI_COMPATIBLE_PREFIX}${newEndpoint.id}`]: { enabled: true }
        }
      });
    } catch (_) {
      // toast already raised by handleSave
    }
  };

  const updateEndpoint = (endpointId, patch) => {
    const next = endpoints.map((e) => (e.id === endpointId ? { ...e, ...patch } : e));
    formik.setFieldValue('openaiCompatibleEndpoints', next);
  };

  const updateEndpointModels = (endpointId, mapFn) => {
    const next = endpoints.map((e) => (e.id === endpointId ? { ...e, models: mapFn(e.models || []) } : e));
    formik.setFieldValue('openaiCompatibleEndpoints', next);
  };

  const handleRemoveEndpoint = async (endpointId) => {
    const providerId = `${OPENAI_COMPATIBLE_PREFIX}${endpointId}`;
    const removed = endpoints.find((e) => e.id === endpointId);
    const removedModelIds = new Set((removed?.models || []).map((m) => m.id));

    const next = endpoints.filter((e) => e.id !== endpointId);
    formik.setFieldValue('openaiCompatibleEndpoints', next);

    const providersCopy = { ...formik.values.providers };
    delete providersCopy[providerId];
    formik.setFieldValue('providers', providersCopy);

    // Drop per-model toggles and clear any selector still pointing at a removed
    // model so the picker doesn't resolve to an unknown id later.
    if (removedModelIds.size > 0) {
      const modelsCopy = { ...(formik.values.models || {}) };
      for (const id of removedModelIds) delete modelsCopy[id];
      formik.setFieldValue('models', modelsCopy);

      if (removedModelIds.has(formik.values.defaultModel)) {
        formik.setFieldValue('defaultModel', '');
      }
      if (removedModelIds.has(formik.values.autocomplete?.model)) {
        formik.setFieldValue('autocomplete.model', '');
      }
    }

    // Best-effort key cleanup so we don't leave orphan encrypted blobs on disk.
    try {
      await clearAiApiKey({ providerId });
    } catch (_) {
      // ignore, key may not have been set
    }
  };

  const usableModels = useMemo(() => {
    if (!status) return [];
    const endpointsById = new Map((formik.values.openaiCompatibleEndpoints || []).map((e) => [e.id, e]));
    return (status.models || []).filter((m) => {
      if (!formik.values.providers?.[m.provider]?.enabled) return false;
      if (!status.providers?.[m.provider]?.configured) return false;
      if (!isModelEnabled(m.id)) return false;
      if (isCompatProviderId(m.provider)) {
        const endpointId = m.provider.slice(OPENAI_COMPATIBLE_PREFIX.length);
        const endpoint = endpointsById.get(endpointId);
        if (!endpoint?.baseURL) return false;
      }
      return true;
    });
  }, [status, formik.values.providers, formik.values.models, formik.values.openaiCompatibleEndpoints]);

  return (
    <StyledWrapper className="w-full flex flex-col text-xs min-h-0 max-h-[calc(100%-30px)]">
      <div className="section-header">AI</div>

      <div className="ai-tabs flex items-center gap-1" role="tablist" aria-label="AI preferences">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'config'}
          className={`ai-tab ${activeTab === 'config' ? 'active' : ''}`}
          onClick={() => setActiveTab('config')}
          data-testid="ai-tab-config"
        >
          <IconSettings size={14} strokeWidth={1.5} />
          Configuration
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'autocomplete'}
          className={`ai-tab ${activeTab === 'autocomplete' ? 'active' : ''}`}
          onClick={() => setActiveTab('autocomplete')}
          data-testid="ai-tab-autocomplete"
        >
          <IconTerminal2 size={14} strokeWidth={1.5} />
          Autocomplete
        </button>
      </div>

      {statusError && (
        <div className="ai-empty-notice px-3.5 py-3 text-xs" role="alert">
          {statusError}
        </div>
      )}

      {activeTab === 'config' && (
        <div className="ai-tab-panel" role="tabpanel">
          <div className="ai-master flex items-center justify-between gap-4 px-3.5 py-3 mb-4">
            <div className="flex flex-col gap-0.5 min-w-0">
              <span className="text-[13px] font-semibold">AI Features</span>
              <span className="ai-master-summary text-[11px]">
                Turn on to configure providers and models. Your keys stay local.
              </span>
            </div>
            <ToggleSwitch
              size="m"
              isOn={formik.values.enabled}
              handleToggle={() => formik.setFieldValue('enabled', !formik.values.enabled)}
            />
          </div>

          {!formik.values.enabled && !statusError && (
            <div className="ai-empty-notice px-3.5 py-3 text-xs">
              Bring your own API key. Bruno talks to providers directly, your keys never leave your machine.
            </div>
          )}

          {formik.values.enabled && status && (
            <>
              <div className="ai-section-header text-[11px] font-medium uppercase tracking-wider mb-2">
                Providers
              </div>
              <div className="flex flex-col gap-1.5">
                {providerIds
                  .filter((id) => !isCompatProviderId(id))
                  .map((id) => {
                    const provider = status.providers[id];
                    const providerEnabled = get(formik.values, `providers.${id}.enabled`, false);

                    const providerToggle = (
                      <ToggleSwitch
                        size="s"
                        isOn={providerEnabled}
                        handleToggle={() =>
                          formik.setFieldValue(`providers.${id}.enabled`, !providerEnabled)}
                      />
                    );

                    return (
                      <ProviderCard
                        key={id}
                        provider={provider}
                        providerEnabled={providerEnabled}
                        providerToggle={providerToggle}
                        models={modelsByProvider[id] || []}
                        isModelEnabled={isModelEnabled}
                        onToggleModel={handleToggleModel}
                        onStatusChange={(next) => setStatus(next)}
                      />
                    );
                  })}
              </div>

              <div className="ai-section-header flex items-center justify-between text-[11px] font-medium uppercase tracking-wider mt-5 mb-2">
                <span>OpenAI-Compatible Endpoints</span>
                <button
                  type="button"
                  className="compat-add-btn inline-flex items-center gap-1 text-[11px] font-medium cursor-pointer normal-case tracking-normal"
                  onClick={handleAddEndpoint}
                  data-testid="ai-compat-add-endpoint"
                >
                  <IconPlus size={13} strokeWidth={1.75} />
                  Add endpoint
                </button>
              </div>

              {endpoints.length === 0 && (
                <div className="ai-empty-notice px-3.5 py-3 text-xs">
                  Point Bruno at any OpenAI-compatible API — Ollama, LM Studio, Together, Groq, OpenRouter, vLLM, and more.
                </div>
              )}

              {endpoints.length > 0 && (
                <div className="flex flex-col gap-1.5">
                  {endpoints.map((endpoint) => {
                    const providerId = `${OPENAI_COMPATIBLE_PREFIX}${endpoint.id}`;
                    const pending = !status.providers[providerId];
                    const provider = status.providers[providerId] || {
                      id: providerId,
                      label: endpoint.name,
                      configured: false,
                      isCustom: true
                    };
                    const providerEnabled = get(formik.values, `providers.${providerId}.enabled`, false);

                    const providerToggle = (
                      <ToggleSwitch
                        size="s"
                        isOn={providerEnabled}
                        handleToggle={() =>
                          formik.setFieldValue(`providers.${providerId}.enabled`, !providerEnabled)}
                      />
                    );

                    return (
                      <CompatEndpointCard
                        key={endpoint.id}
                        endpoint={endpoint}
                        provider={provider}
                        providerEnabled={providerEnabled}
                        providerToggle={providerToggle}
                        pending={pending}
                        isModelEnabled={isModelEnabled}
                        onToggleModel={handleToggleModel}
                        onChangeName={(name) => updateEndpoint(endpoint.id, { name })}
                        onChangeBaseURL={(baseURL) => updateEndpoint(endpoint.id, { baseURL })}
                        onAddModel={(model) =>
                          updateEndpointModels(endpoint.id, (models) => [...models, model])}
                        onRemoveModel={(modelId) =>
                          updateEndpointModels(endpoint.id, (models) =>
                            models.filter((m) => m.id !== modelId)
                          )}
                        onUpdateModel={(modelId, patch) =>
                          updateEndpointModels(endpoint.id, (models) =>
                            models.map((m) => (m.id === modelId ? { ...m, ...patch } : m))
                          )}
                        onRemoveEndpoint={handleRemoveEndpoint}
                        onStatusChange={(next) => setStatus(next)}
                      />
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {activeTab === 'autocomplete' && (
        <div className="ai-tab-panel" role="tabpanel">
          <AutocompletePane
            aiEnabled={formik.values.enabled}
            enabled={formik.values.autocomplete?.enabled !== false}
            model={formik.values.autocomplete?.model || ''}
            triggerMode={formik.values.autocomplete?.triggerMode || 'debounced'}
            availableModels={usableModels}
            hasConfiguredProvider={Boolean(
              status && Object.entries(status.providers || {}).some(
                ([providerId, p]) => p?.configured && formik.values.providers?.[providerId]?.enabled
              )
            )}
            onToggleEnabled={(next) => formik.setFieldValue('autocomplete.enabled', next)}
            onChangeModel={(next) => formik.setFieldValue('autocomplete.model', next)}
            onChangeTriggerMode={(next) => formik.setFieldValue('autocomplete.triggerMode', next)}
          />
        </div>
      )}
    </StyledWrapper>
  );
};

export default AI;
