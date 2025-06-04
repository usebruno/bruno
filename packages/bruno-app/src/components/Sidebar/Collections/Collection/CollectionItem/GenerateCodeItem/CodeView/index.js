import CodeEditor from 'components/CodeEditor/index';
import get from 'lodash/get';
import { HTTPSnippet } from 'httpsnippet';
import { useTheme } from 'providers/Theme/index';
import StyledWrapper from './StyledWrapper';
import { buildHarRequest } from 'utils/codegenerator/har';
import { useSelector } from 'react-redux';
import { CopyToClipboard } from 'react-copy-to-clipboard';
import toast from 'react-hot-toast';
import { IconCopy } from '@tabler/icons';
import { findCollectionByItemUid, getAllVariables, getGlobalEnvironmentVariables } from 'utils/collections/index';
import { getAuthHeaders } from 'utils/codegenerator/auth';
import { cloneDeep } from 'lodash';
import { useMemo } from 'react';
import {
  interpolateHeaders,
  interpolateBody,
  createVariablesObject
} from 'utils/interpolation/index';

const CodeView = ({ language, item, shouldInterpolate }) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);
  const requestHeaders = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');

  let _collection = findCollectionByItemUid(
    useSelector((state) => state.collections.collections),
    item.uid
  );

  let collection = cloneDeep(_collection);

  // Add selected global env variables to the collection object
  const globalEnvironmentVariables = getGlobalEnvironmentVariables({
    globalEnvironments,
    activeGlobalEnvironmentUid
  });
  collection.globalEnvironmentVariables = globalEnvironmentVariables;

  const collectionRootAuth = collection?.root?.request?.auth;
  const requestAuth = item.draft ? get(item, 'draft.request.auth') : get(item, 'request.auth');

  const headers = [
    ...getAuthHeaders(collectionRootAuth, requestAuth),
    ...(collection?.root?.request?.headers || []),
    ...(requestHeaders || [])
  ];

  const collectionVars = useMemo(() => {
    const collectionRequestVars = get(collection, 'root.request.vars.req', []);
    return collectionRequestVars.reduce((acc, variable) => {
      if (variable.enabled) {
        acc[variable.name] = variable.value;
      }
      return acc;
    }, {});
  }, [collection]);

  const allVariables = useMemo(() => {
    const vars = getAllVariables(collection, item);
    const { process, ...restVars } = vars;
    return {
      ...restVars,
      ...collectionVars
    };
  }, [collection, item, collectionVars]);

  // Create variables object for interpolation
  const variablesForInterpolation = useMemo(() => {
    return createVariablesObject({
      globalEnvironmentVariables,
      allVariables,
      collectionVars,
      collection,
      runtimeVariables: collection.runtimeVariables || {},
      processEnvVars: collection.processEnvVariables || {}
    });
  }, [globalEnvironmentVariables, allVariables, collectionVars, collection]);

  // Interpolate headers using the dedicated function
  const interpolatedHeaders = useMemo(() => {
    if (!shouldInterpolate) return headers || [];

    return interpolateHeaders(headers, variablesForInterpolation);
  }, [headers, shouldInterpolate, variablesForInterpolation]);

  // Interpolate body using the dedicated function
  const interpolatedBody = useMemo(() => {
    const body = item.draft?.request?.body || item.request?.body;
    if (!shouldInterpolate) return body;

    return interpolateBody(body, variablesForInterpolation);
  }, [item, shouldInterpolate, variablesForInterpolation]);

  let snippet = '';
  try {
    snippet = new HTTPSnippet(buildHarRequest({
      request: {
        ...item.request,
        body: interpolatedBody
      },
      headers: interpolatedHeaders,
      type: item.type
    })).convert(
      language.target,
      language.client
    );
  } catch (e) {
    console.error(e);
    snippet = 'Error generating code snippet';
  }

  return (
    <StyledWrapper>
      <CopyToClipboard
        text={snippet}
        onCopy={() => toast.success('Copied to clipboard!')}
      >
        <button className="copy-to-clipboard">
          <IconCopy size={25} strokeWidth={1.5} />
        </button>
      </CopyToClipboard>
      <div className="editor-content">
        <CodeEditor
          readOnly
          collection={collection}
          item={item}
          value={snippet}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
          theme={displayedTheme}
          mode={language.language}
          enableVariableHighlighting={true}
        />
      </div>
    </StyledWrapper>
  );
};

export default CodeView;
