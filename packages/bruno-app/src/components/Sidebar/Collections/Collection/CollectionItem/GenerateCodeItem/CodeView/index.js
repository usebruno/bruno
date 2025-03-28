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
import { interpolateUrl } from 'utils/url/index';

const CodeView = ({ language, item, shouldInterpolate }) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);
  const { globalEnvironments, activeGlobalEnvironmentUid } = useSelector((state) => state.globalEnvironments);
  const { target, client } = language;
  const requestHeaders = item.draft ? get(item, 'draft.request.headers') : get(item, 'request.headers');
  let _collection = findCollectionByItemUid(
    useSelector((state) => state.collections.collections),
    item.uid
  );

  let collection = cloneDeep(_collection);

  // add selected global env variables to the collection object
  const globalEnvironmentVariables = getGlobalEnvironmentVariables({ globalEnvironments, activeGlobalEnvironmentUid });
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
  

  const interpolatedHeaders = useMemo(() => {
    if (!shouldInterpolate) return headers;

    return (headers).map(header => ({
      ...header,
      value: interpolateUrl({
        url: header.value,
        globalEnvironmentVariables,
        envVars: {
          ...allVariables,
          ...collectionVars
        },
        runtimeVariables: collection.runtimeVariables || {},
        processEnvVars: collection.processEnvVariables || {}
      })
    }));
  }, [item, allVariables, globalEnvironmentVariables, collection, collectionVars]);

  // Interpolate body
  const interpolatedBody = useMemo(() => {
    const body = item.draft?.request?.body || item.request.body;
    if (!body) return null;
    if (!shouldInterpolate) return body;
    const interpolateValue = (value) => {
      return interpolateUrl({
        url: value,
        globalEnvironmentVariables,
        envVars: {
          ...allVariables,
          ...collectionVars
        },
        runtimeVariables: collection.runtimeVariables || {},
        processEnvVars: collection.processEnvVariables || {}
      });
    };

    const interpolatedBody = { ...body };
    
    // Interpolate different body modes
    if (body.mode === 'json' && body.json) {
      try {
        const jsonObj = JSON.parse(body.json);
        const interpolatedJson = JSON.stringify(jsonObj, (_, value) => {
          return typeof value === 'string' ? interpolateValue(value) : value;
        }, 2);
        interpolatedBody.json = interpolatedJson;
      } catch (e) {
        interpolatedBody.json = body.json;
      }
    } else if (body.mode === 'text') {
      interpolatedBody.text = interpolateValue(body.text);
    } else if (body.mode === 'xml') {
      interpolatedBody.xml = interpolateValue(body.xml);
    } else if (body.mode === 'formUrlEncoded') {
      interpolatedBody.formUrlEncoded = body.formUrlEncoded.map(param => ({
        ...param,
        value: param.enabled ? interpolateValue(param.value) : param.value
      }));
    } else if (body.mode === 'multipartForm') {
      interpolatedBody.multipartForm = body.multipartForm.map(param => ({
        ...param,
        value: param.type === 'text' && param.enabled ? interpolateValue(param.value) : param.value
      }));
    }

    return interpolatedBody;
  }, [item, allVariables, globalEnvironmentVariables, collection, collectionVars]);


  let snippet = '';
  try {
    snippet = new HTTPSnippet(buildHarRequest({ request:{
      ...item.request,
      body: interpolatedBody
    }, headers: interpolatedHeaders, type: item.type })).convert(
      target,
      client
    );
  } catch (e) {
    console.error(e);
    snippet = 'Error generating code snippet';
  }

  return (
    <StyledWrapper>
      <div className="editor-wrapper">
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
            value={snippet}
            font={get(preferences, 'font.codeFont', 'default')}
            fontSize={get(preferences, 'font.codeFontSize', 12)}
            theme={displayedTheme}
            mode={language.language}
          />
        </div>
      </div>
    </StyledWrapper>
  );
};

export default CodeView;
