import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import get from 'lodash/get';
import debounce from 'lodash/debounce';
import { useFormik } from 'formik';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { IconSettings, IconTerminal2 } from '@tabler/icons';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import ToggleSwitch from 'components/ToggleSwitch';
import { getAiStatus } from 'utils/ai';
import ProviderCard from './ProviderCard';
import AutocompletePane from './AutocompletePane';
import StyledWrapper from './StyledWrapper';

const aiPreferencesSchema = Yup.object().shape({
  enabled: Yup.boolean(),
  providers: Yup.object(),
  models: Yup.object(),
  defaultModel: Yup.string().max(200).nullable(),
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
    (values) => {
      dispatch(
        savePreferences({
          ...preferences,
          ai: {
            enabled: values.enabled,
            providers: values.providers,
            models: values.models,
            defaultModel: values.defaultModel || '',
            autocomplete: {
              enabled: values.autocomplete?.enabled !== false,
              model: values.autocomplete?.model || '',
              triggerMode: values.autocomplete?.triggerMode || 'debounced'
            }
          }
        })
      ).catch((err) => {
        console.error('Failed to save AI preferences:', err);
        toast.error('Failed to save AI preferences');
      });
    },
    [dispatch, preferences]
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

  const usableModels = useMemo(() => {
    if (!status) return [];
    return (status.models || []).filter((m) => {
      if (!formik.values.providers?.[m.provider]?.enabled) return false;
      if (!status.providers?.[m.provider]?.configured) return false;
      return isModelEnabled(m.id);
    });
  }, [status, formik.values.providers, formik.values.models]);

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
                {providerIds.map((id) => {
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
