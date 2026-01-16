import React, { useState, useRef, useEffect } from 'react';
import classnames from 'classnames';
import WorkspaceHome from 'components/WorkspaceHome';
import ManageWorkspace from 'components/ManageWorkspace';
import RequestTabs from 'components/RequestTabs';
import RequestTabPanel from 'components/RequestTabPanel';
import Sidebar from 'components/Sidebar';
import StatusBar from 'components/StatusBar';
import AppTitleBar from 'components/AppTitleBar';
import ApiSpecPanel from 'components/ApiSpecPanel';
// import ErrorCapture from 'components/ErrorCapture';
import { useSelector } from 'react-redux';
import { isElectron } from 'utils/common/platform';
import StyledWrapper from './StyledWrapper';
import 'codemirror/theme/material.css';
import 'codemirror/theme/monokai.css';
import 'codemirror/addon/scroll/simplescrollbars.css';
import 'swagger-ui-react/swagger-ui.css';
import Devtools from 'components/Devtools';
import useGrpcEventListeners from 'utils/network/grpc-event-listeners';
import useWsEventListeners from 'utils/network/ws-event-listeners';
import Portal from 'components/Portal';

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
  const activeApiSpecUid = useSelector((state) => state.apiSpec.activeApiSpecUid);
  const isDragging = useSelector((state) => state.app.isDragging);
  const showHomePage = useSelector((state) => state.app.showHomePage);
  const showApiSpecPage = useSelector((state) => state.app.showApiSpecPage);
  const showManageWorkspacePage = useSelector((state) => state.app.showManageWorkspacePage);
  const isConsoleOpen = useSelector((state) => state.logs.isConsoleOpen);
  const mainSectionRef = useRef(null);
  const [showRosettaBanner, setShowRosettaBanner] = useState(false);

  // Initialize event listeners
  useGrpcEventListeners();
  useWsEventListeners();

  const className = classnames({
    'is-dragging': isDragging
  });

  useEffect(() => {
    if (!isElectron()) {
      return;
    }

    const { ipcRenderer } = window;

    const removeAppLoadedListener = ipcRenderer.on('main:app-loaded', (init) => {
      if (mainSectionRef.current) {
        mainSectionRef.current.setAttribute('data-app-state', 'loaded');
      }
      setShowRosettaBanner(init.isRunningInRosetta);
    });

    return () => {
      removeAppLoadedListener();
    };
  }, []);

  return (
    // <ErrorCapture>
    <div id="main-container" className="flex flex-col h-screen max-h-screen overflow-hidden">
      <AppTitleBar />
      {showRosettaBanner ? (
        <Portal>
          <div className="fixed bottom-0 left-0 right-0 z-10 bg-amber-100 border border-amber-400 text-amber-700 px-4 py-3" role="alert">
            <strong className="font-bold">WARNING:</strong>
            <div>
              It looks like Bruno was launched as the Intel (x64) build under Rosetta on your Apple Silicon Mac. This can cause reduced performance and unexpected behavior.
            </div>
            <button className="absolute right-2 top-0 text-xl" onClick={() => setShowRosettaBanner(!showRosettaBanner)}>
              &times;
            </button>
          </div>
        </Portal>
      ) : null}
      <div
        ref={mainSectionRef}
        className="flex-1 min-h-0 flex"
        data-app-state="loading"
        style={{
          height: isConsoleOpen ? `calc(100vh - 60px - ${isConsoleOpen ? '300px' : '0px'})` : 'calc(100vh - 60px)'
        }}
      >
        <StyledWrapper className={className} style={{ height: '100%', zIndex: 1 }}>
          <Sidebar />
          <section className="flex flex-grow flex-col overflow-hidden">
            {showApiSpecPage && activeApiSpecUid ? (
              <ApiSpecPanel key={activeApiSpecUid} />
            ) : showManageWorkspacePage ? (
              <ManageWorkspace />
            ) : showHomePage || !activeTabUid ? (
              <WorkspaceHome />
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
