import React, { useMemo, useState } from 'react';
import { useDispatch } from 'react-redux';
import get from 'lodash/get';
import { updateCollectionChaiPlugins } from 'providers/ReduxStore/slices/collections';
import { saveCollectionSettings } from 'providers/ReduxStore/slices/collections/actions';
import { uuid } from 'utils/common';
import StyledWrapper from './StyledWrapper';
import PluginsSidebar from './PluginsSidebar';
import PluginDetail from './PluginDetail';
import EmptyState from './EmptyState';
import CatalogModal from './CatalogModal';
import TemplatePickerModal from './TemplatePickerModal';

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

  const [selectedUid, setSelectedUid] = useState(plugins[0]?.uid || null);
  const [modal, setModal] = useState(null);
  const [validationState, setValidationState] = useState({});

  const activePlugin = useMemo(
    () => plugins.find((p) => p.uid === selectedUid) || plugins[0] || null,
    [plugins, selectedUid]
  );

  const persistPlugins = (next) => {
    dispatch(
      updateCollectionChaiPlugins({
        collectionUid: collection.uid,
        chaiPlugins: next
      })
    );
  };

  const addPlugin = (entry) => {
    const next = [...plugins, entry];
    persistPlugins(next);
    setSelectedUid(entry.uid);
  };

  const addFromCatalog = (catalogEntry) => {
    addPlugin({
      uid: uuid(),
      name: catalogEntry.name,
      enabled: true,
      code: catalogEntry.snippet
    });
    setModal(null);
  };

  const addFromTemplate = (template) => {
    addPlugin({
      uid: uuid(),
      name: template.name.toLowerCase().replace(/\s+/g, '-'),
      enabled: true,
      code: template.snippet
    });
    setModal(null);
  };

  const addEmpty = () => {
    addPlugin({
      uid: uuid(),
      name: 'new-plugin',
      enabled: true,
      code: EMPTY_TEMPLATE
    });
  };

  const updateActive = (patch) => {
    if (!activePlugin) return;
    const next = plugins.map((p) => (p.uid === activePlugin.uid ? { ...p, ...patch } : p));
    persistPlugins(next);
    // Invalidate cached parse result whenever code changes
    if ('code' in patch) {
      setValidationState((prev) => ({ ...prev, [activePlugin.uid]: null }));
    }
  };

  const deleteActive = () => {
    if (!activePlugin) return;
    const idx = plugins.findIndex((p) => p.uid === activePlugin.uid);
    const next = plugins.filter((p) => p.uid !== activePlugin.uid);
    persistPlugins(next);
    setValidationState((prev) => {
      const cleaned = { ...prev };
      delete cleaned[activePlugin.uid];
      return cleaned;
    });
    if (next.length === 0) {
      setSelectedUid(null);
    } else {
      const nextActive = next[Math.max(0, idx - 1)] || next[0];
      setSelectedUid(nextActive.uid);
    }
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

  return (
    <StyledWrapper className="plugins-panel">
      <header className="panel-head">
        <div>
          <h2 className="panel-title">Plugins</h2>
          <p className="panel-blurb">
            Extend the <code>chai</code> assertion library. Code runs once before every
            pre-request, post-response, and test script in this collection.
          </p>
        </div>
      </header>

      {plugins.length === 0 ? (
        <EmptyState
          onBrowseCatalog={() => setModal('catalog')}
          onWriteFromScratch={addEmpty}
        />
      ) : (
        <div className="panel-body">
          <PluginsSidebar
            plugins={plugins}
            activeUid={activePlugin?.uid}
            validationState={validationState}
            onSelect={setSelectedUid}
            onMove={reorderByUid}
            onBrowseCatalog={() => setModal('catalog')}
            onPickTemplate={() => setModal('templates')}
            onAddEmpty={addEmpty}
          />
          {activePlugin && (
            <PluginDetail
              plugin={activePlugin}
              collection={collection}
              onChange={updateActive}
              onDelete={deleteActive}
              onSave={handleSave}
              validation={validationState[activePlugin.uid]}
              onValidate={handleValidate}
            />
          )}
        </div>
      )}

      {modal === 'catalog' && (
        <CatalogModal
          collection={collection}
          currentPlugins={plugins}
          onAdd={addFromCatalog}
          onClose={() => setModal(null)}
        />
      )}
      {modal === 'templates' && (
        <TemplatePickerModal onInsert={addFromTemplate} onClose={() => setModal(null)} />
      )}
    </StyledWrapper>
  );
};

export default Plugins;
