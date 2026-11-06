import React from 'react';
import EmptyAppState from 'components/EmptyAppState';

/**
 * The guest surface shared by the request-level app view and standalone
 * collection apps: the <webview> once its document URL is known, the
 * registration error, or a loading placeholder while the URL resolves.
 */
const AppWebviewPane = ({ src, error, webviewRef }) => {
  if (src) {
    return (
      <webview
        ref={webviewRef}
        src={src}
        partition="bruno-app-view"
        webpreferences="disableDialogs=true, javascript=yes"
        className="app-webview"
      />
    );
  }
  if (error) {
    return <EmptyAppState title="App failed to load" hint={error} />;
  }
  return <div className="p-4 text-xs opacity-60">Loading app…</div>;
};

export default AppWebviewPane;
