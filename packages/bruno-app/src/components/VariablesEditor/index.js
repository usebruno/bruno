import React, { useState } from 'react';
import get from 'lodash/get';
import filter from 'lodash/filter';
import { Inspector } from 'react-inspector';
import { useTheme } from 'providers/Theme';
import { findEnvironmentInCollection, maskInputValue } from 'utils/collections';
import StyledWrapper from './StyledWrapper';
import { IconEye, IconEyeOff } from '@tabler/icons';

const KeyValueExplorer = ({ data = [], theme }) => {
  const [showSecret, setShowSecret] = useState(false);

  return (
    <div>
      <SecretToggle showSecret={showSecret} onClick={() => setShowSecret(!showSecret)} />
      <table className="border-collapse">
        <tbody>
          {data.map((envVar) => (
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
        <span className="muted ml-2">({environment.name})</span>
      </div>
      {enabledEnvVars.length > 0 ? (
        <KeyValueExplorer data={enabledEnvVars} theme={theme} />
      ) : (
        <div className="muted text-xs">No environment variables found</div>
      )}
    </>
  );
};

const CollectionVariables = ({ collection, theme }) => {
  const collectionVariablesFound = Object.keys(collection.collectionVariables).length > 0;

  const collectionVariableArray = Object.entries(collection.collectionVariables).map(([name, value]) => ({
    name,
    value,
    secret: false
  }));

  return (
    <>
      <h1 className="font-semibold mb-2">Collection Variables</h1>
      {collectionVariablesFound ? (
        <KeyValueExplorer data={collectionVariableArray} theme={theme} />
      ) : (
        <div className="muted text-xs">No collection variables found</div>
      )}
    </>
  );
};

const VariablesEditor = ({ collection }) => {
  const { storedTheme } = useTheme();

  const reactInspectorTheme = storedTheme === 'light' ? 'chromeLight' : 'chromeDark';

  return (
    <StyledWrapper id="VariablesEditor" className="px-4 py-4 overflow-y-auto">
      <div className="h-full w-full overflow-y-auto">
        <CollectionVariables collection={collection} theme={reactInspectorTheme} />
        <EnvVariables collection={collection} theme={reactInspectorTheme} />

        <div className="mt-8 muted text-xs">
          Note: As of today, collection variables can only be set via the API -{' '}
          <span className="font-medium">getVar()</span> and <span className="font-medium">setVar()</span>. <br />
          In the next release, we will add a UI to set and modify collection variables.
        </div>
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
