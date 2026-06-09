import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import get from 'lodash/get';
import debounce from 'lodash/debounce';
import { useFormik } from 'formik';
import { useDispatch, useSelector } from 'react-redux';
import * as Yup from 'yup';
import toast from 'react-hot-toast';
import { IconStars } from '@tabler/icons';
import { savePreferences } from 'providers/ReduxStore/slices/app';
import ToggleSwitch from 'components/ToggleSwitch';
import { getAiStatus } from 'utils/ai';
import ProviderCard from './ProviderCard';
import StyledWrapper from './StyledWrapper';

const aiPreferencesSchema = Yup.object().shape({
  enabled: Yup.boolean(),
  providers: Yup.object(),
  models: Yup.object(),
  defaultModel: Yup.string().max(200).nullable()
});

const AI = () => {
  const dispatch = useDispatch();
  const preferences = useSelector((state) => state.app.preferences);
  const [status, setStatus] = useState(null);
  const [statusError, setStatusError] = useState(null);

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
      defaultModel: get(preferences, 'ai.defaultModel', '')
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
            defaultModel: values.defaultModel || ''
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

  const summary = useMemo(() => {
    if (!status || !formik.values.enabled) return 'Turn on to configure providers and models';
    const usableProviders = Object.values(status.providers).filter(
      (p) => p.configured && formik.values.providers?.[p.id]?.enabled
    );
    if (usableProviders.length === 0) return 'Add a provider to get started';
    // Count models live from formik + current key status, not the electron-side
    // snapshot which lags behind toggle changes during the save debounce window.
    const totalEnabledModels = (status.models || []).filter((m) => {
      if (!formik.values.providers?.[m.provider]?.enabled) return false;
      if (!status.providers?.[m.provider]?.configured) return false;
      return isModelEnabled(m.id);
    }).length;
    const plural = (n, s) => `${n} ${s}${n === 1 ? '' : 's'}`;
    return `${plural(usableProviders.length, 'provider')} · ${plural(totalEnabledModels, 'model')} ready`;
  }, [status, formik.values.enabled, formik.values.providers, formik.values.models]);

  return (
    <StyledWrapper className="w-full flex flex-col text-xs min-h-0 max-h-[calc(100%-30px)]">
      <div className="section-header">AI</div>

      <div className="ai-master flex items-center justify-between gap-4 px-3.5 py-3 mb-4">
        <div className="flex flex-col gap-0.5 min-w-0">
          <div className="flex items-center gap-2 text-[13px] font-semibold">
            <IconStars size={15} strokeWidth={1.75} className="ai-master-icon" />
            <span>AI Features</span>
          </div>
          <span className="ai-master-summary text-[11px]">{summary}</span>
        </div>
        <ToggleSwitch
          size="m"
          isOn={formik.values.enabled}
          handleToggle={() => formik.setFieldValue('enabled', !formik.values.enabled)}
        />
      </div>

      {statusError && (
        <div className="ai-empty-notice px-3.5 py-3 text-xs" role="alert">
          {statusError}
        </div>
      )}

      {!formik.values.enabled && !statusError && (
        <div className="ai-empty-notice px-3.5 py-3 text-xs">
          Bring your own API key. Bruno talks to providers directly, your keys never leave your machine.
        </div>
      )}

      {formik.values.enabled && status && (
        <>
          <div className="ai-section-header text-[11px] font-medium uppercase tracking-wider mt-[18px] mb-2">
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
    </StyledWrapper>
  );
};

export default AI;
