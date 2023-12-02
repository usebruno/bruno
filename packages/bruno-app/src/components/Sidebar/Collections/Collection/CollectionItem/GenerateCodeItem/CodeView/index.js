import CodeEditor from 'components/CodeEditor/index';
import get from 'lodash/get';
import { HTTPSnippet } from 'httpsnippet';
import { useTheme } from 'providers/Theme/index';
import { buildHarRequest } from 'utils/codegenerator/har';
import { useSelector } from 'react-redux';
import { uuid } from 'utils/common';
import cloneDeep from 'lodash/cloneDeep';

const CodeView = ({ language, item }) => {
  const { storedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const { target, client, language: lang } = language;
  const headers = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');

  let newHeaders = cloneDeep(headers);

  const auth =
    get(item, 'draft.request.auth') !== undefined ? get(item, 'draft.request.auth') : get(item, 'request.auth');

  if (auth.mode === 'bearer') {
    newHeaders.push({
      name: 'Authorization',
      value: 'Bearer ' + auth.bearer.token,
      enabled: true,
      uid: uuid()
    });
  }

  let collectionVariables = item.collection.collectionVariables;

  for (let i = 0; i < newHeaders.length; i++) {
    let headerValue = newHeaders[i].value;

    // Look for variables {{  }}
    let matches = headerValue.match(/{{(.*?)}}/);

    if (matches) {
      let variableName = matches[1];

      // look if variable exists
      if (collectionVariables.hasOwnProperty(variableName)) {
        newHeaders[i].value = headerValue.replace(matches[0], collectionVariables[variableName]);
      }
    }
  }

  let snippet = '';

  try {
    snippet = new HTTPSnippet(buildHarRequest({ request: item.request, newHeaders })).convert(target, client);
  } catch (e) {
    console.error(e);
    snippet = 'Error generating code snippet';
  }

  return (
    <CodeEditor
      readOnly
      value={snippet}
      font={get(preferences, 'font.codeFont', 'default')}
      theme={storedTheme}
      mode={lang}
    />
  );
};

export default CodeView;
