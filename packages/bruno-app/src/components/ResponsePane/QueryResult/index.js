import React from 'react';
import CodeEditor from 'components/CodeEditor';
import { useTheme } from 'providers/Theme';
import { usePreferences } from 'providers/Preferences';
import { useDispatch } from 'react-redux';
import { sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import classnames from 'classnames';
import { getContentType, safeStringifyJSON, safeParseXML } from 'utils/common';
import { getCodeMirrorModeBasedOnContentType } from 'utils/common/codemirror';

import StyledWrapper from './StyledWrapper';
import { useState } from 'react';
import { useMemo } from 'react';

const QueryResult = ({ item, collection, data, width, disableRunEventListener, headers, error }) => {
  const { storedTheme } = useTheme();
  const { preferences } = usePreferences();
  const [tab, setTab] = useState('preview');
  const dispatch = useDispatch();
  const contentType = getContentType(headers);
  const mode = getCodeMirrorModeBasedOnContentType(contentType);

  const formatResponse = (data, mode) => {
    if (!data) {
      return '';
    }

    if (mode.includes('json')) {
      return safeStringifyJSON(data, true);
    }

    if (mode.includes('xml')) {
      let parsed = safeParseXML(data, { collapseContent: true });

      if (typeof parsed === 'string') {
        return parsed;
      }

      return safeStringifyJSON(parsed, true);
    }

    if (['text', 'html'].includes(mode)) {
      if (typeof data === 'string') {
        return data;
      }

      return safeStringifyJSON(data);
    }

    if (mode.includes('image')) {
      return item.requestSent.url;
    }

    // final fallback
    if (typeof data === 'string') {
      return data;
    }

    return safeStringifyJSON(data);
  };

  const value = formatResponse(data, mode);

  const onRun = () => {
    if (disableRunEventListener) {
      return;
    }
    dispatch(sendRequest(item, collection.uid));
  };

  const getTabClassname = (tabName) => {
    return classnames(`select-none ${tabName}`, {
      active: tabName === tab,
      'cursor-pointer': tabName !== tab
    });
  };

  const getTabs = () => {
    if (!mode.includes('html')) {
      return null;
    }

    return (
      <>
        <div className={getTabClassname('raw')} role="tab" onClick={() => setTab('raw')}>
          Raw
        </div>
        <div className={getTabClassname('preview')} role="tab" onClick={() => setTab('preview')}>
          Preview
        </div>
      </>
    );
  };

  const activeResult = useMemo(() => {
    if (
      tab === 'preview' &&
      mode.includes('html') &&
      item.requestSent &&
      item.requestSent.url &&
      typeof data === 'string'
    ) {
      // Add the Base tag to the head so content loads properly. This also needs the correct CSP settings
      const webViewSrc = data.replace('<head>', `<head><base href="${item.requestSent.url}">`);
      return (
        <webview
          src={`data:text/html; charset=utf-8,${encodeURIComponent(webViewSrc)}`}
          webpreferences="disableDialogs=true, javascript=yes"
          className="h-full bg-white"
        />
      );
    } else if (mode.includes('image')) {
      return <img src={item.requestSent.url} alt="image" />;
    }

    return <CodeEditor collection={collection} font={preferences.codeFont} theme={storedTheme} onRun={onRun} value={value} mode={mode} readOnly />;
  }, [tab, collection, storedTheme, onRun, value, mode]);

  return (
    <StyledWrapper className="w-full h-full" style={{ maxWidth: width }}>
      <div className="flex justify-end gap-2 text-xs" role="tablist">
        {getTabs()}
      </div>
      {error ? <span className="text-red-500">{error}</span> : activeResult}
    </StyledWrapper>
  );
};

export default QueryResult;
