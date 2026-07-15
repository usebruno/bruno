import React, { lazy, Suspense, useState, useRef, useEffect } from 'react';
import classnames from 'classnames';
import RequestTabs from 'components/RequestTabs';
import Sidebar from 'components/Sidebar';
import StatusBar from 'components/StatusBar';
import AppTitleBar from 'components/AppTitleBar';
import PageLoader from 'components/RequestTabPanel/RequestTabPanelLoading';
// import ErrorCapture from 'components/ErrorCapture';
import { useSelector } from 'react-redux';
import { isElectron } from 'utils/common/platform';
import StyledWrapper from './StyledWrapper';
import Portal from 'components/Portal';
import SaveTransientRequestContainer from 'components/SaveTransientRequest/Container';
import SaveTransientRequest from 'components/SaveTransientRequest';
import useGrpcEventListeners from 'utils/network/grpc-event-listeners';
import useWsEventListeners from 'utils/network/ws-event-listeners';

// Heavy components — loaded only when first needed
const ManageWorkspace = lazy(() => import('components/ManageWorkspace'));
const RequestTabPanel = lazy(() => import('components/RequestTabPanel'));
const AppPreviewKeepAlive = lazy(() => import('components/AppPreviewKeepAlive'));
const AiChatSidebar = lazy(() => import('components/AiChatSidebar'));
const AiChatPopout = lazy(() => import('components/AiChatSidebar/Popout'));
const ApiSpecPanel = lazy(() => import('components/ApiSpecPanel'));
const TabPanelErrorBoundary = lazy(() => import('components/RequestTabPanel/TabPanelErrorBoundary'));
const Devtools = lazy(() => import('components/Devtools'));

const TransientRequestModalsRenderer = ({ modals }) => {
  if (modals.length === 0) {
    return null;
  }

  if (modals.length === 1) {
    return (
      <SaveTransientRequest
        item={modals[0].item}
        collection={modals[0].collection}
        isOpen={true}
      />
    );
  }

  return <SaveTransientRequestContainer />;
};

export default function Main() {
  const activeTabUid = useSelector((state) => state.tabs.activeTabUid);
  const activeApiSpecUid = useSelector((state) => state.apiSpec.activeApiSpecUid);
  const isDragging = useSelector((state) => state.app.isDragging);
  const showApiSpecPage = useSelector((state) => state.app.showApiSpecPage);
  const showManageWorkspacePage = useSelector((state) => state.app.showManageWorkspacePage);
  const isConsoleOpen = useSelector((state) => state.logs.isConsoleOpen);
  const saveTransientRequestModals = useSelector((state) => state.collections.saveTransientRequestModals);

  // AI sidebar mounts here so it spans the full request-pane height. It reads
  // the active collection via the active tab so the sidebar follows tab switches.
  // The selector returns null while the sidebar is closed so the page doesn't
  // re-render on every tabs/collections change — important on Windows where
  // extra re-renders during initial layout were destabilising CodeMirror.
  const isAiSidebarOpen = useSelector((state) => state.chat.isOpen);
  const isAiPoppedOut = useSelector((state) => state.chat.isPoppedOut);
  const activeCollection = useSelector((state) => {
    if (!state.chat.isOpen) return null;
    const activeTab = state.tabs.tabs.find((t) => t.uid === state.tabs.activeTabUid);
    if (!activeTab) return null;
    return state.collections.collections.find((c) => c.uid === activeTab.collectionUid) || null;
  });
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
              <Suspense fallback={<PageLoader />}>
                <ApiSpecPanel key={activeApiSpecUid} />
              </Suspense>
            ) : showManageWorkspacePage ? (
              <Suspense fallback={<PageLoader />}>
                <ManageWorkspace />
              </Suspense>
            ) : (
              <>
                <RequestTabs />
                <div className="relative flex flex-col flex-grow overflow-hidden">
                  <Suspense fallback={<PageLoader />}>
                    <TabPanelErrorBoundary key={activeTabUid} tabUid={activeTabUid}>
                      <RequestTabPanel key={activeTabUid} />
                    </TabPanelErrorBoundary>
                  </Suspense>
                  <Suspense fallback={null}>
                    <AppPreviewKeepAlive />
                  </Suspense>
                </div>
              </>
            )}
          </section>
          {isAiSidebarOpen && activeCollection && isAiPoppedOut && (
            <Suspense fallback={<PageLoader />}>
              <AiChatPopout collection={activeCollection} />
            </Suspense>
          )}
          {isAiSidebarOpen && activeCollection && !isAiPoppedOut && !showApiSpecPage && !showManageWorkspacePage && (
            <Suspense fallback={<PageLoader />}>
              <AiChatSidebar collection={activeCollection} />
            </Suspense>
          )}
        </StyledWrapper>
      </div>

      <Suspense fallback={<PageLoader />}>
        <Devtools mainSectionRef={mainSectionRef} />
      </Suspense>
      <StatusBar />
      <TransientRequestModalsRenderer modals={saveTransientRequestModals} />
    </div>
    // </ErrorCapture>
  );
}
