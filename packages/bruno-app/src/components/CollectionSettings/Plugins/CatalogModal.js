import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { IconCheck, IconAlertCircle, IconExternalLink, IconPlus, IconLoader2, IconDownload } from '@tabler/icons';
import Modal from 'components/Modal';
import StatusBadge from 'ui/StatusBadge';
import Button from 'ui/Button';
import { CATALOG, COMPAT_META } from './catalog';

const openExternal = (url) => {
  if (window?.ipcRenderer?.openExternal) {
    window.ipcRenderer.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

// installStates[pluginName]: undefined | 'installing' | { ok: true } | { ok: false, message }

const CatalogModal = ({ collection, currentPlugins, onAdd, onClose }) => {
  const [installStates, setInstallStates] = useState({});
  const [addedHere, setAddedHere] = useState({}); // plugins added in this modal session

  // On mount, ask the main process which catalog packages are already installed
  // in this collection's node_modules. This keeps the "Installed" pill accurate
  // across app restarts (Install state is otherwise per-modal-session only).
  useEffect(() => {
    const pkgs = CATALOG
      .filter((p) => p.compat === 'node-only' && p.npmPackage)
      .map((p) => p.npmPackage);

    if (!pkgs.length || !collection?.pathname || !window?.ipcRenderer?.invoke) return;

    let cancelled = false;
    window.ipcRenderer
      .invoke('renderer:check-installed-packages', collection.pathname, pkgs)
      .then((report) => {
        if (cancelled || !report) return;
        setInstallStates((prev) => {
          const next = { ...prev };
          for (const plugin of CATALOG) {
            if (plugin.compat !== 'node-only' || !plugin.npmPackage) continue;
            // Don't override an in-flight or just-completed local action.
            if (next[plugin.name]) continue;
            if (report[plugin.npmPackage]) {
              next[plugin.name] = { ok: true };
            }
          }
          return next;
        });
      })
      .catch(() => { /* best-effort detection; fall back to per-session state */ });

    return () => { cancelled = true; };
  }, [collection?.pathname]);

  const isAdded = (plugin) => {
    if (addedHere[plugin.name]) return true;
    return Array.isArray(currentPlugins)
      && currentPlugins.some((p) => p.name === plugin.name);
  };

  const runInstall = async (plugin) => {
    if (!window?.ipcRenderer?.invoke) {
      const message = 'IPC not available — install requires the desktop app.';
      setInstallStates((s) => ({ ...s, [plugin.name]: { ok: false, message } }));
      toast.error(message);
      return;
    }
    if (!collection?.pathname) {
      const message = 'Collection path is unavailable.';
      setInstallStates((s) => ({ ...s, [plugin.name]: { ok: false, message } }));
      toast.error(message);
      return;
    }

    setInstallStates((s) => ({ ...s, [plugin.name]: 'installing' }));
    try {
      // Reuses the generic npm-install IPC introduced in PR #8143 (the channel
      // name says "postman-packages" but the handler is parameter-generic).
      const result = await window.ipcRenderer.invoke(
        'renderer:install-postman-packages',
        collection.pathname,
        [plugin.npmPackage]
      );
      if (result?.success) {
        setInstallStates((s) => ({ ...s, [plugin.name]: { ok: true } }));
        toast.success(`Installed ${plugin.npmPackage}`);
      } else {
        const message = result?.stderr?.split('\n').slice(-1)[0]
          || `npm exited with code ${result?.exitCode ?? '?'}`;
        setInstallStates((s) => ({ ...s, [plugin.name]: { ok: false, message } }));
        toast.error(`Install failed: ${plugin.npmPackage}`);
      }
    } catch (err) {
      const message = err?.message || String(err);
      setInstallStates((s) => ({ ...s, [plugin.name]: { ok: false, message } }));
      toast.error(`Install failed: ${plugin.npmPackage}`);
    }
  };

  const handleAdd = (plugin) => {
    onAdd(plugin);
    setAddedHere((s) => ({ ...s, [plugin.name]: true }));
  };

  const handleAddAndInstall = async (plugin) => {
    handleAdd(plugin);
    if (plugin.compat === 'node-only' && plugin.npmPackage) {
      await runInstall(plugin);
    }
  };

  const renderStateRow = (plugin) => {
    const added = isAdded(plugin);
    const install = installStates[plugin.name];
    const needsInstall = plugin.compat === 'node-only' && plugin.npmPackage;
    const installing = install === 'installing';
    const installed = install?.ok === true;
    const installFailed = install?.ok === false;
    // "Added but won't work yet" — added + needs install + no install attempt
    // has succeeded yet (no record, or last record was a failure).
    const needsInstallWarning = added && needsInstall && !installing && !installed;

    return (
      <div className="card-state-row">
        {added && (
          <span className="card-pill ok">
            <IconCheck size={11} strokeWidth={2.5} />
            Added
          </span>
        )}
        {needsInstall && installing && (
          <span className="card-pill installing">
            <IconLoader2 size={11} strokeWidth={2} className="spin" />
            Installing…
          </span>
        )}
        {needsInstall && installed && (
          <span className="card-pill ok">
            <IconCheck size={11} strokeWidth={2.5} />
            Installed
          </span>
        )}
        {needsInstall && installFailed && (
          <span className="card-pill err" title={install.message}>
            <IconAlertCircle size={11} strokeWidth={2} />
            Install failed
          </span>
        )}
        {needsInstallWarning && !installFailed && (
          <span
            className="card-pill warn"
            title={`Plugin won't run until "${plugin.npmPackage}" is installed.`}
          >
            <IconAlertCircle size={11} strokeWidth={2} />
            Needs install
          </span>
        )}
      </div>
    );
  };

  const renderActions = (plugin) => {
    const added = isAdded(plugin);
    const install = installStates[plugin.name];
    const needsInstall = plugin.compat === 'node-only' && plugin.npmPackage;
    const installing = install === 'installing';
    const installed = install?.ok === true;
    const installFailed = install?.ok === false;

    const buttons = [];

    if (!added) {
      // If the npm package is already installed (e.g. carried over from a
      // previous session), skip the install step — just add.
      const shouldInstallOnAdd = needsInstall && !installed;
      buttons.push(
        <Button
          key="add"
          type="button"
          size="sm"
          color="primary"
          icon={<IconPlus size={14} strokeWidth={2} />}
          onClick={() => (shouldInstallOnAdd ? handleAddAndInstall(plugin) : handleAdd(plugin))}
          disabled={installing}
          data-testid={`catalog-add-${plugin.name}`}
        >
          {shouldInstallOnAdd ? 'Add & install' : 'Add to collection'}
        </Button>
      );
    } else if (needsInstall && !installed) {
      buttons.push(
        <Button
          key="install"
          type="button"
          size="sm"
          color="primary"
          variant="outline"
          icon={<IconDownload size={14} strokeWidth={2} />}
          onClick={() => runInstall(plugin)}
          disabled={installing}
          data-testid={`catalog-install-${plugin.name}`}
        >
          {installFailed ? 'Retry install' : 'Install'}
        </Button>
      );
    }

    return (
      <div className="card-actions">
        <div className="card-actions-buttons">{buttons}</div>
        <button
          type="button"
          className="card-docs"
          onClick={() => openExternal(plugin.docsUrl)}
        >
          Docs
          <IconExternalLink size={12} strokeWidth={1.75} />
        </button>
      </div>
    );
  };

  return (
    <Modal
      title="Browse Chai Plugins"
      size="lg"
      handleCancel={onClose}
      hideFooter
    >
      <div className="plugins-catalog">
        <div className="catalog-grid">
          {CATALOG.map((plugin) => {
            const meta = COMPAT_META[plugin.compat];
            return (
              <div className="catalog-card" key={plugin.name}>
                <div className="card-head">
                  <div className="card-name">{plugin.name}</div>
                  <StatusBadge status={meta.status} variant="light" size="xs">
                    {meta.label}
                  </StatusBadge>
                </div>
                <p className="card-desc">{plugin.description}</p>
                {renderStateRow(plugin)}
                {renderActions(plugin)}
              </div>
            );
          })}
        </div>
      </div>
    </Modal>
  );
};

export default CatalogModal;
