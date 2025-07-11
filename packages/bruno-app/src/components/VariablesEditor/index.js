import React, { useState } from 'react';
import get from 'lodash/get';
import filter from 'lodash/filter';
import { Inspector } from 'react-inspector';
import { useTheme } from 'providers/Theme';
import { findEnvironmentInCollection, maskInputValue } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import { IconEye, IconEyeOff } from '@tabler/icons';
import { IconClipboard } from '@tabler/icons';
import toast from 'react-hot-toast';

const copyValueToClipboard = (value) => {
  // Convert any value to string
  let str = String(value);

  // If it's a string and surrounded by quotes, remove them
  if (str.startsWith('"') && str.endsWith('"')) {
    str = str.slice(1, -1);
  }

  // Write to clipboard
  navigator.clipboard.writeText(str).then(() => {
    toast.success("Copied to clipboard");
  }).catch((err) => {
    toast.error("Failed to copy");
    console.error("Copy failed:", err);
  });
};

const KeyValueExplorer = ({ data = [], theme }) => {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div>
      <SecretToggle showSecret={showSecret} onClick={() => setShowSecret(!showSecret)} />
      <table className="border-collapse">
        <tbody>
          {data.toSorted((a, b) => a.name.localeCompare(b.name)).map((envVar) => (
            <tr key={envVar.name}>
              <td className="px-2 py-1">
                <div className="flex items-center justify-between gap-1">
                  <span>{envVar.name}</span>
                  <button
                    onClick={() =>
                      copyValueToClipboard(
                        !showSecret && envVar.secret ? maskInputValue(envVar.value) : envVar.value
                      )
                    }
                    className="flex items-center gap-1 text-xs px-1.5 py-0.5"
                    title="Copy value"
                  >
                    <IconClipboard size={14} strokeWidth={1.5} />
                  </button>
                </div>
              </td>
              <td className="px-2 py-1">
                <div className="flex justify-between items-center gap-2">
                  <Inspector
                    data={!showSecret && envVar.secret ? maskInputValue(envVar.value) : envVar.value}
                    theme={theme}
                  />
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const EnvVariables = ({ collection, theme }) => {
  const environment = findEnvironmentInCollection(collection, collection.activeEnvironmentUid);

  if (!environment) {
    return (
      <>
        <h1 className="font-semibold mt-4 mb-2">Environment Variables</h1>
        <div className="muted text-xs">No environment selected</div>
      </>
    );
  }

  const envVars = get(environment, 'variables', []);
  const enabledEnvVars = filter(envVars, (variable) => variable.enabled);

  return (
    <>
      <div className="flex items-center mt-4 mb-2">
        <h1 className="font-semibold">Environment Variables</h1>
        <div className="flex items-center gap-2 ml-2">
          <span>{environment.name}</span>
          <button
            onClick={() => copyValueToClipboard(environment.name)}
            className="flex items-center gap-1 text-xs px-1.5 py-0.5"
            title="Copy environment name"
          >
            <IconClipboard size={14} strokeWidth={1.5} />
          </button>
        </div>
      </div>
      {enabledEnvVars.length > 0 ? (
        <KeyValueExplorer data={enabledEnvVars} theme={theme} />
      ) : (
        <div className="muted text-xs">No environment variables found</div>
      )}
    </>
  );
};

const RuntimeVariables = ({ collection, theme }) => {
  const runtimeVariablesFound = Object.keys(collection.runtimeVariables).length > 0;

  const runtimeVariableArray = Object.entries(collection.runtimeVariables).map(([name, value]) => ({
    name,
    value,
    secret: false
  }));

  return (
    <>
      <h1 className="font-semibold mb-2">Runtime Variables</h1>
      {runtimeVariablesFound ? (
        <KeyValueExplorer data={runtimeVariableArray} theme={theme} />
      ) : (
        <div className="muted text-xs">No runtime variables found</div>
      )}
    </>
  );
};

const VariablesEditor = ({ collection }) => {
  const { storedTheme } = useTheme();

  const reactInspectorTheme = storedTheme === 'light' ? 'chromeLight' : 'chromeDark';

  return (
    <StyledWrapper className="px-4 py-4">
      <RuntimeVariables collection={collection} theme={reactInspectorTheme} />
      <EnvVariables collection={collection} theme={reactInspectorTheme} />

      <div className="mt-8 muted text-xs">
        Note: As of today, runtime variables can only be set via the API - <span className="font-medium">getVar()</span>{' '}
        and <span className="font-medium">setVar()</span>. <br />
      </div>
    </StyledWrapper>
  );
};

export default VariablesEditor;

const SecretToggle = ({ showSecret, onClick }) => (
  <div className="cursor-pointer mb-2 text-xs" onClick={onClick}>
    <div className="flex items-center">
      {showSecret ? <IconEyeOff size={16} strokeWidth={1.5} /> : <IconEye size={16} strokeWidth={1.5} />}
      <span className="pl-1">{showSecret ? 'Hide secret variable values' : 'Show secret variable values'}</span>
    </div>
  </div>
);
