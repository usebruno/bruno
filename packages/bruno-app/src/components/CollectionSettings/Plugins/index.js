import React, { useEffect, useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import get from 'lodash/get';
import { IconPlus } from '@tabler/icons';
import { updateCollectionChaiPlugins } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { uuid } from 'utils/common';
import Modal from 'components/Modal';
import { extractRequiredPackages } from './validatePlugin';
import { CATALOG } from './catalog';
import StyledWrapper from './StyledWrapper';
import PluginCard from './PluginCard';
import CatalogPanel from './CatalogPanel';
import EmptyState from './EmptyState';

const EMPTY_TEMPLATE = `// Define a custom chai plugin for this collection.
// This code runs once before every pre-request, post-response, and test script.

chai.use(function (chai, utils) {
  // chai.Assertion.addMethod('beEven', function () { ... });
});
`;

const Plugins = ({ collection }) => {
  const dispatch = useDispatch();

  const plugins = collection.draft?.brunoConfig
    ? get(collection, 'draft.brunoConfig.scripts.plugins.chai', [])
    : get(collection, 'brunoConfig.scripts.plugins.chai', []);

  const [catalogOpen, setCatalogOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState(() => new Set());
  const [validationState, setValidationState] = useState({});
  const [installedMap, setInstalledMap] = useState({});
  const [installingPackages, setInstallingPackages] = useState({});

  // Set of all npm packages required by any plugin in this collection — used
  // to drive the installed-or-not check for each card.
  const requiredPackages = useMemo(() => {
    const all = new Set();
    for (const p of plugins) {
      extractRequiredPackages(p.code || '').forEach((pkg) => all.add(pkg));
    }
    // Also pre-check catalog packages so the catalog panel shows accurate
    // "Installed" pills without a second IPC roundtrip.
    // (Catalog list is small, ~6 entries, no performance concern.)
    for (const c of CATALOG) {
      if (c.npmPackage) all.add(c.npmPackage);
    }
    return Array.from(all);
  }, [plugins]);

  const refreshInstalledMap = useMemo(() => async () => {
    if (!window?.ipcRenderer?.invoke || !collection?.pathname) return;
    if (requiredPackages.length === 0) {
      setInstalledMap({});
      return;
    }
    try {
      const report = await window.ipcRenderer.invoke(
        'renderer:check-installed-packages',
        collection.pathname,
        requiredPackages
      );
      setInstalledMap(report || {});
    } catch (_) { /* best-effort */ }
  }, [requiredPackages, collection?.pathname]);

  useEffect(() => { refreshInstalledMap(); }, [refreshInstalledMap]);

  // First render: auto-expand the first card so the user sees code immediately
  useEffect(() => {
    if (plugins.length === 0) return;
    setExpandedIds((prev) => {
      if (prev.size > 0) return prev;
      const next = new Set();
      next.add(plugins[0].uid);
      return next;
    });
  }, [plugins]);

  const persistPlugins = (next) => {
    dispatch(
      updateCollectionChaiPlugins({
        collectionUid: collection.uid,
        chaiPlugins: next
      })
    );
  };

  const toggleExpanded = (uid) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(uid)) next.delete(uid);
      else next.add(uid);
      return next;
    });
  };

  const addPlugin = (entry, { expand = true } = {}) => {
    const next = [...plugins, entry];
    persistPlugins(next);
    if (expand) {
      setExpandedIds((prev) => new Set(prev).add(entry.uid));
    }
  };

  const installPackages = async (pkgs) => {
    if (!Array.isArray(pkgs) || pkgs.length === 0) return null;
    if (!window?.ipcRenderer?.invoke || !collection?.pathname) {
      toast.error('Install requires the desktop app.');
      return null;
    }
    setInstallingPackages((prev) => {
      const next = { ...prev };
      pkgs.forEach((p) => { next[p] = true; });
      return next;
    });
    try {
      const result = await window.ipcRenderer.invoke(
        'renderer:install-postman-packages',
        collection.pathname,
        pkgs
      );
      if (result?.success) {
        toast.success(`Installed ${pkgs.join(', ')}`);
      } else {
        const message = result?.stderr?.split('\n').slice(-1)[0]
          || `npm exited with code ${result?.exitCode ?? '?'}`;
        toast.error(`Install failed: ${message}`);
      }
      return result;
    } catch (err) {
      toast.error(`Install failed: ${err?.message || err}`);
      return null;
    } finally {
      setInstallingPackages((prev) => {
        const next = { ...prev };
        pkgs.forEach((p) => { delete next[p]; });
        return next;
      });
      refreshInstalledMap();
    }
  };

  const addFromCatalog = async (catalogEntry, { install } = {}) => {
    addPlugin({
      uid: uuid(),
      name: catalogEntry.name,
      enabled: true,
      code: catalogEntry.snippet
    });
    if (install && catalogEntry.npmPackage) {
      await installPackages([catalogEntry.npmPackage]);
    }
  };

  const addFromTemplate = (template) => {
    addPlugin({
      uid: uuid(),
      name: template.name.toLowerCase().replace(/\s+/g, '-'),
      enabled: true,
      code: template.snippet
    });
  };

  const addEmpty = () => {
    addPlugin({
      uid: uuid(),
      name: 'new-plugin',
      enabled: true,
      code: EMPTY_TEMPLATE
    });
  };

  const updatePlugin = (uid, patch) => {
    const next = plugins.map((p) => (p.uid === uid ? { ...p, ...patch } : p));
    persistPlugins(next);
    if ('code' in patch) {
      setValidationState((prev) => ({ ...prev, [uid]: null }));
    }
  };

  const deletePlugin = (uid) => {
    const next = plugins.filter((p) => p.uid !== uid);
    persistPlugins(next);
    setValidationState((prev) => {
      const cleaned = { ...prev };
      delete cleaned[uid];
      return cleaned;
    });
    setExpandedIds((prev) => {
      const ns = new Set(prev);
      ns.delete(uid);
      return ns;
    });
  };

  const reorderByUid = (sourceUid, targetUid) => {
    if (sourceUid === targetUid) return;
    const from = plugins.findIndex((p) => p.uid === sourceUid);
    const to = plugins.findIndex((p) => p.uid === targetUid);
    if (from < 0 || to < 0) return;
    const next = [...plugins];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    persistPlugins(next);
  };

  const handleValidate = (uid, result) => {
    setValidationState((prev) => ({ ...prev, [uid]: result }));
  };

  const handleSave = () => dispatch(saveCollectionSettings(collection.uid));

  const summary = useMemo(() => {
    const total = plugins.length;
    const active = plugins.filter((p) => p.enabled !== false).length;
    const allMissing = new Set();
    for (const p of plugins) {
      extractRequiredPackages(p.code || '').forEach((pkg) => {
        if (installedMap[pkg] === false) allMissing.add(pkg);
      });
    }
    return { total, active, needsInstall: allMissing.size };
  }, [plugins, installedMap]);

  return (
    <StyledWrapper className="plugins-panel">
      <header className="panel-head">
        <div className="panel-head-text">
          <h2 className="panel-title">Plugins</h2>
          <p className="panel-blurb">
            Extend the <code>chai</code> assertion library. Code runs once before every
            pre-request, post-response, and test script in this collection.
          </p>
        </div>
        {plugins.length > 0 && (
          <div className="panel-head-actions">
            <span className="panel-summary">
              {summary.total} plugin{summary.total === 1 ? '' : 's'} ·
              {' '}{summary.active} active
              {summary.needsInstall > 0 ? ` · ${summary.needsInstall} need install` : ''}
            </span>
            <button
              type="button"
              className="add-plugin-btn"
              onClick={() => setCatalogOpen((v) => !v)}
              aria-expanded={catalogOpen}
            >
              <IconPlus size={14} strokeWidth={2} />
              Add plugin
            </button>
            <button
              type="button"
              className="save-btn"
              onClick={handleSave}
            >
              Save
            </button>
          </div>
        )}
      </header>

      {catalogOpen && (
        <Modal
          size="lg"
          title="Browse Chai Plugins"
          handleCancel={() => setCatalogOpen(false)}
          hideFooter
        >
          <CatalogPanel
            currentPlugins={plugins}
            installedMap={installedMap}
            installingPackages={installingPackages}
            onAddCatalog={addFromCatalog}
            onAddTemplate={addFromTemplate}
            onAddEmpty={addEmpty}
            onInstallPackage={installPackages}
            onClose={() => setCatalogOpen(false)}
          />
        </Modal>
      )}

      {plugins.length === 0 ? (
        <EmptyState
          onBrowseCatalog={() => setCatalogOpen(true)}
          onWriteFromScratch={addEmpty}
        />
      ) : (
        <ul className="plugin-list">
          {plugins.map((plugin, index) => (
            <li key={plugin.uid}>
              <PluginCard
                plugin={plugin}
                index={index}
                collection={collection}
                validation={validationState[plugin.uid]}
                installedMap={installedMap}
                installingPackages={installingPackages}
                expanded={expandedIds.has(plugin.uid)}
                onToggleExpanded={toggleExpanded}
                onChange={(patch) => updatePlugin(plugin.uid, patch)}
                onDelete={deletePlugin}
                onMove={reorderByUid}
                onValidate={handleValidate}
                onInstallPackage={installPackages}
              />
            </li>
          ))}
        </ul>
      )}
    </StyledWrapper>
  );
};

export default Plugins;
