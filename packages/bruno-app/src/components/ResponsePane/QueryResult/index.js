import React from 'react';
import CodeEditor from 'components/CodeEditor';
import { useTheme } from 'providers/Theme';
import { useDispatch } from 'react-redux';
import { sendRequest } from 'providers/ReduxStore/slices/collections/actions';
import classnames from 'classnames';

import StyledWrapper from './StyledWrapper';
import { useState } from 'react';
import { useMemo } from 'react';

const QueryResult = ({ item, collection, value, width, disableRunEventListener, mode }) => {
  const { storedTheme } = useTheme();
  const [tab, setTab] = useState('raw');
  const dispatch = useDispatch();

  const onRun = () => {
    if (disableRunEventListener) {
      return;
    }
    dispatch(sendRequest(item, collection.uid));
  };

  const getTabClassname = (tabName) => {
    return classnames(`tab select-none ${tabName}`, {
      active: tabName === tab
    });
  };

  const tabs = [(
    <div className={getTabClassname('raw')} role="tab" onClick={() => setTab('raw')}>
      Raw
    </div>
  )];
  if (mode.includes('text/html')) {
    tabs.push(
      <div className={getTabClassname('preview')} role="tab" onClick={() => setTab('preview')}>
        Preview
      </div>
    );
  }

  const activeResult = useMemo(() => {
    if (tab === 'preview') {
      // Add the Base tag to the head so content loads proparly. This also needs the correct CSP settings
      const webViewSrc = value.replace('<head>', `<head><base href="${item.requestSent.url}">`);
      return (
        <webview
          src={`data:text/html; charset=utf-8,${encodeURIComponent(webViewSrc)}`}
          webpreferences="disableDialogs=true, javascript=yes"
          className="h-full bg-white"
        />
      );
    }

    return (
      <CodeEditor
        collection={collection}
        theme={storedTheme}
        onRun={onRun}
        value={value || ''}
        mode={mode}
        readOnly
      />
    );
  }, [tab, collection, storedTheme, onRun, value, mode]);

  return (
    <StyledWrapper className="px-3 w-full h-full" style={{ maxWidth: width }}>
      {tabs.length > 1 ? (
        <div className="flex flex-wrap items-center px-3 tabs mb-3" role="tablist">
          {tabs}
        </div>
      ) : null}
      {activeResult}
    </StyledWrapper>
  );
};

export default QueryResult;
