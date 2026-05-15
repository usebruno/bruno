import React, { useState } from 'react';
import get from 'lodash/get';
import filter from 'lodash/filter';
import { Inspector, chromeDark, chromeLight } from 'react-inspector';
import { useTheme } from 'providers/Theme';
import { useTranslation } from 'react-i18next';
import { findEnvironmentInCollection, maskInputValue } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import { IconEye, IconEyeOff } from '@tabler/icons';

const KeyValueExplorer = ({ data = [], theme }) => {
  const { t } = useTranslation();
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div>
      <SecretToggle showSecret={showSecret} onClick={() => setShowSecret(!showSecret)} t={t} />
      <table className="border-collapse">
        <tbody>
          {data.toSorted((a, b) => a.name.localeCompare(b.name)).map((envVar) => (
            <tr key={envVar.name}>
              <td className="px-2 py-1">{envVar.name}</td>
              <td className="px-2 py-1">
                <Inspector
                  data={!showSecret && envVar.secret ? maskInputValue(envVar.value) : envVar.value}
                  theme={theme}
                />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const EnvVariables = ({ collection, theme }) => {
  const { t } = useTranslation();
  const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);

  if (!environment) {
    return (
      <>
        <h1 className="font-medium mt-4 mb-2">{t('VARIABLES_EDITOR.ENVIRONMENT_VARIABLES')}</h1>
        <div className="muted text-xs">{t('VARIABLES_EDITOR.NO_ENVIRONMENT_SELECTED')}</div>
      </>
    );
  }

  const envVars = get(environment, 'variables', []);
  const enabledEnvVars = filter(envVars, (variable) => variable.enabled);

  return (
    <>
      <div className="flex items-center mt-4 mb-2">
        <h1 className="font-medium">{t('VARIABLES_EDITOR.ENVIRONMENT_VARIABLES')}</h1>
        <span className="muted ml-2">({environment.name})</span>
      </div>
      {enabledEnvVars.length > 0 ? (
        <KeyValueExplorer data={enabledEnvVars} theme={theme} />
      ) : (
        <div className="muted text-xs">{t('VARIABLES_EDITOR.NO_ENVIRONMENT_VARIABLES')}</div>
      )}
    </>
  );
};

const RuntimeVariables = ({ collection, theme }) => {
  const { t } = useTranslation();
  const runtimeVariablesFound = Object.keys(collection.runtimeVariables).length > 0;

  const runtimeVariableArray = Object.entries(collection.runtimeVariables).map(([name, value]) => ({
    name,
    value,
    secret: false
  }));

  return (
    <>
      <h1 className="font-medium mb-2">{t('VARIABLES_EDITOR.RUNTIME_VARIABLES')}</h1>
      {runtimeVariablesFound ? (
        <KeyValueExplorer data={runtimeVariableArray} theme={theme} />
      ) : (
        <div className="muted text-xs">{t('VARIABLES_EDITOR.NO_RUNTIME_VARIABLES')}</div>
      )}
    </>
  );
};

const VariablesEditor = ({ collection }) => {
  const { t } = useTranslation();
  const { displayedTheme, theme } = useTheme();

  const reactInspectorTheme
    = displayedTheme === 'light'
      ? { ...chromeLight, OBJECT_VALUE_STRING_COLOR: theme.text.base }
      : { ...chromeDark, OBJECT_VALUE_STRING_COLOR: theme.text.base };

  return (
    <StyledWrapper className="px-4 py-4 overflow-auto">
      <RuntimeVariables collection={collection} theme={reactInspectorTheme} />
      <EnvVariables collection={collection} theme={reactInspectorTheme} />

      <div className="mt-8 muted text-xs">
        {t('VARIABLES_EDITOR.RUNTIME_NOTE_LINE1')}<br />
        {t('VARIABLES_EDITOR.RUNTIME_NOTE_LINE2')}<br />
      </div>
    </StyledWrapper>
  );
};

export default VariablesEditor;

const SecretToggle = ({ showSecret, onClick, t }) => (
  <div className="cursor-pointer mb-2 text-xs" onClick={onClick}>
    <div className="flex items-center">
      {showSecret ? <IconEyeOff size={16} strokeWidth={1.5} /> : <IconEye size={16} strokeWidth={1.5} />}
      <span className="pl-1">{showSecret ? t('VARIABLES_EDITOR.HIDE_SECRET_VALUES') : t('VARIABLES_EDITOR.SHOW_SECRET_VALUES')}</span>
    </div>
  </div>
);
