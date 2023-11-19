import React from 'react';
import get from 'lodash/get';
import filter from 'lodash/filter';
import { Inspector } from 'react-inspector';
import { useTheme } from 'providers/Theme';
import { findEnvironmentInCollection } from 'utils/collections';
import StyledWrapper from './StyledWrapper';

const KeyValueExplorer = ({ data, theme }) => {
  data = data || {};

  return (
    <div>
      <table className="border-collapse">
        <tbody>
          {Object.entries(data).map(([key, value]) => (
            <tr key={key}>
              <td className="px-2 py-1">{key}</td>
              <td className="px-2 py-1">
                <Inspector data={value} theme={theme} />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

const Cookies = ({ collection, theme }) => {
  const collectionVariablesFound = Object.keys(collection.cookies).length > 0;

  return (
    <>
      <h1 className="font-semibold mb-2">Current cookies</h1>
      {collectionVariablesFound ? (
        <KeyValueExplorer data={collection.cookies} theme={theme} />
      ) : (
        <div className="muted text-xs">No cookies found</div>
      )}
    </>
  );
};

const CookieEditor = ({ collection }) => {
  const { storedTheme } = useTheme();

  const reactInspectorTheme = storedTheme === 'light' ? 'chromeLight' : 'chromeDark';

  return (
    <StyledWrapper className="px-4 py-4">
      <Cookies collection={collection} theme={reactInspectorTheme} />

      <div className="mt-8 muted text-xs">
        Cookies are stored per collection. <br />
        Currently, they are <i>not persisted</i> to storage.
      </div>
    </StyledWrapper>
  );
};

export default CookieEditor;
