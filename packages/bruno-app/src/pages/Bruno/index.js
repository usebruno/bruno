import React, { useState, useCallback, useRef, useEffect } from 'react';
import classnames from 'classnames';
import Welcome from 'components/Welcome';
import RequestTabs from 'components/RequestTabs';
import RequestTabPanel from 'components/RequestTabPanel';
import Sidebar from 'components/Sidebar';
import StatusBar from 'components/StatusBar';
// import ErrorCapture from 'components/ErrorCapture';
import { useSelector } from 'react-redux';
import { isElectron } from 'utils/common/platform';
import StyledWrapper from './StyledWrapper';
import 'codemirror/theme/material.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/addon/scroll/simplescrollbars.css';
import Devtools from 'components/Devtools';

require('codemirror/mode/javascript/javascript');
require('codemirror/mode/xml/xml');
require('codemirror/mode/sparql/sparql');
require('codemirror/addon/comment/comment');
require('codemirror/addon/dialog/dialog');
require('codemirror/addon/edit/closebrackets');
require('codemirror/addon/edit/matchbrackets');
require('codemirror/addon/fold/brace-fold');
require('codemirror/addon/fold/foldgutter');
require('codemirror/addon/fold/xml-fold');
require('codemirror/addon/hint/javascript-hint');
require('codemirror/addon/hint/show-hint');
require('codemirror/addon/lint/lint');
require('codemirror/addon/lint/json-lint');
require('codemirror/addon/mode/overlay');
require('codemirror/addon/scroll/simplescrollbars');
require('codemirror/addon/search/jump-to-line');
require('codemirror/addon/search/search');
require('codemirror/addon/search/searchcursor');
require('codemirror/addon/display/placeholder');
require('codemirror/keymap/sublime');

require('codemirror-graphql/hint');
require('codemirror-graphql/info');
require('codemirror-graphql/jump');
require('codemirror-graphql/lint');
require('codemirror-graphql/mode');

require('utils/codemirror/brunoVarInfo');
require('utils/codemirror/javascript-lint');
require('utils/codemirror/autocomplete');

export default function Main() {
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const isDragging = useSelector((state) => state.app.isDragging);
  const showHomePage = useSelector((state) => state.app.showHomePage);
  const isConsoleOpen = useSelector((state) => state.logs.isConsoleOpen);
  const mainSectionRef = useRef(null);

  const className = classnames({
    'is-dragging': isDragging
  });

  useEffect(() => {
    if (!isElectron()) {
      return;
    }

    const { ipcRenderer } = window;

    const removeAppLoadedListener = ipcRenderer.on('main:app-loaded', () => {
      if (mainSectionRef.current) {
        mainSectionRef.current.setAttribute('data-app-state', 'loaded');
      }
    });

    return () => {
      removeAppLoadedListener();
    };
  }, []);

  return (
    // <ErrorCapture>
      <div id="main-container" className="flex flex-col h-screen max-h-screen overflow-hidden">
        <div
          ref={mainSectionRef}
          className="flex-1 min-h-0 flex"
          data-app-state="loading"
          style={{
            height: isConsoleOpen ? `calc(100vh - 22px - ${isConsoleOpen ? '300px' : '0px'})` : 'calc(100vh - 22px)'
          }}
        >
          <StyledWrapper className={className} style={{ height: '100%', zIndex: 1 }}>
            <Sidebar />
            <section className="flex flex-grow flex-col overflow-hidden">
              {showHomePage ? (
                <Welcome />
              ) : (
                <>
                  <RequestTabs />
                  <RequestTabPanel key={activeTabUid} />
                </>
              )}
            </section>
          </StyledWrapper>
        </div>

        <Devtools mainSectionRef={mainSectionRef} />
        <StatusBar />
      </div>
    // </ErrorCapture>
  );
}
