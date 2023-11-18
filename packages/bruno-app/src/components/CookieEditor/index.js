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
  // const collectionVariablesFound = Object.keys(collection.collectionVariables).length > 0;
  const collectionVariablesFound = true;

  const demo_data = {
    session_cookie: '1234567890',
    user_id: '1234',
    user_name: 'John Doe'
  };

  return (
    <>
      <h1 className="font-semibold mb-2">Current cookies</h1>
      {collectionVariablesFound ? (
        // <KeyValueExplorer data={collection.collectionVariables} theme={theme} />
        <KeyValueExplorer data={demo_data} theme={theme} />
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
        Note: As of today, cookies are active WIP. <br />
        It's done when it's done, thx.
      </div>
    </StyledWrapper>
  );
};

export default CookieEditor;
