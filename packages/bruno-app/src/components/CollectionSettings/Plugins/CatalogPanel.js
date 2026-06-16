import React, { useState } from 'react';
import {
  IconPlus,
  IconCheck,
  IconLoader2,
  IconDownload,
  IconExternalLink,
  IconStack2,
  IconCode
} from '@tabler/icons';
import StatusBadge from 'ui/StatusBadge';
import { CATALOG, COMPAT_META } from './catalog';
import { TEMPLATES } from './templates';

const openExternal = (url) => {
  if (window?.ipcRenderer?.openExternal) {
    window.ipcRenderer.openExternal(url);
  } else {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

const TABS = [
  { id: 'catalog', label: 'Catalog', icon: IconStack2 },
  { id: 'templates', label: 'Templates', icon: IconCode }
];

const CatalogPanel = ({
  currentPlugins,
  installedMap,
  installingPackages,
  onAddCatalog,
  onAddTemplate,
  onAddEmpty,
  onInstallPackage,
  onClose
}) => {
  const [tab, setTab] = useState('catalog');
  const [selectedTemplate, setSelectedTemplate] = useState(TEMPLATES[0]?.name);

  const activeTemplate = TEMPLATES.find((t) => t.name === selectedTemplate) || TEMPLATES[0];

  const isAdded = (name) => Array.isArray(currentPlugins)
    && currentPlugins.some((p) => p.name === name);

  return (
    <section className="catalog-panel" role="region" aria-label="Add plugin">
      <div className="catalog-tabs">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              type="button"
              className={`catalog-tab ${tab === t.id ? 'active' : ''}`}
              onClick={() => setTab(t.id)}
            >
              <Icon size={13} strokeWidth={1.75} />
              {t.label}
            </button>
          );
        })}
        <button
          type="button"
          className="catalog-tab"
          onClick={() => {
            onAddEmpty();
            onClose();
          }}
          title="Start from a blank scaffold"
        >
          <IconPlus size={13} strokeWidth={2} />
          Empty plugin
        </button>
      </div>

      <div className="catalog-body">
        {tab === 'catalog' && (
          <div className="catalog-grid">
            {CATALOG.map((plugin) => {
              const meta = COMPAT_META[plugin.compat];
              const added = isAdded(plugin.name);
              const installed = plugin.npmPackage
                ? installedMap?.[plugin.npmPackage] === true
                : true;
              const installing = plugin.npmPackage && installingPackages?.[plugin.npmPackage];
              const needsInstallStep = plugin.compat === 'node-only' && plugin.npmPackage && !installed;

              return (
                <div className="catalog-card" key={plugin.name}>
                  <div className="card-head">
                    <div className="card-name">{plugin.name}</div>
                    <StatusBadge status={meta.status} variant="light" size="xs">
                      {meta.label}
                    </StatusBadge>
                  </div>
                  <p className="card-desc">{plugin.description}</p>

                  <div className="catalog-card-state">
                    {added && (
                      <span className="card-pill ok">
                        <IconCheck size={11} strokeWidth={2.5} />Added
                      </span>
                    )}
                    {plugin.npmPackage && installing && (
                      <span className="card-pill installing">
                        <IconLoader2 size={11} strokeWidth={2} className="spin" />Installing…
                      </span>
                    )}
                    {plugin.npmPackage && !installing && installed && (
                      <span className="card-pill ok">
                        <IconCheck size={11} strokeWidth={2.5} />Installed
                      </span>
                    )}
                    {plugin.npmPackage && !installing && !installed && added && (
                      <span className="card-pill warn">Needs install</span>
                    )}
                  </div>

                  <div className="card-actions">
                    <div className="card-actions-buttons">
                      {!added && (
                        <button
                          type="button"
                          className="catalog-action primary"
                          onClick={async () => {
                            await onAddCatalog(plugin, { install: needsInstallStep });
                          }}
                          disabled={!!installing}
                        >
                          <IconPlus size={13} strokeWidth={2} />
                          {needsInstallStep ? 'Add & install' : 'Add to collection'}
                        </button>
                      )}
                      {added && needsInstallStep && (
                        <button
                          type="button"
                          className="catalog-action outline"
                          onClick={() => onInstallPackage([plugin.npmPackage])}
                          disabled={!!installing}
                        >
                          <IconDownload size={13} strokeWidth={2} />
                          Install
                        </button>
                      )}
                    </div>
                    <button
                      type="button"
                      className="card-docs"
                      onClick={() => openExternal(plugin.docsUrl)}
                    >
                      Docs<IconExternalLink size={11} strokeWidth={1.75} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tab === 'templates' && activeTemplate && (
          <div className="templates-split">
            <ul className="templates-list" role="listbox" aria-label="Templates">
              {TEMPLATES.map((tpl) => (
                <li key={tpl.name}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={tpl.name === activeTemplate.name}
                    className={`templates-list-item ${tpl.name === activeTemplate.name ? 'active' : ''}`}
                    onClick={() => setSelectedTemplate(tpl.name)}
                    onDoubleClick={() => {
                      onAddTemplate(tpl);
                      onClose();
                    }}
                  >
                    <span className="template-name">{tpl.name}</span>
                    <span className="template-desc">{tpl.description}</span>
                  </button>
                </li>
              ))}
            </ul>

            <div className="template-detail">
              <div className="template-detail-head">
                <div>
                  <div className="template-detail-name">{activeTemplate.name}</div>
                  <div className="template-detail-desc">{activeTemplate.description}</div>
                </div>
                <button
                  type="button"
                  className="catalog-action primary"
                  onClick={() => {
                    onAddTemplate(activeTemplate);
                    onClose();
                  }}
                >
                  <IconPlus size={13} strokeWidth={2} />
                  Insert into collection
                </button>
              </div>

              {Array.isArray(activeTemplate.adds) && activeTemplate.adds.length > 0 && (
                <div className="template-meta">
                  <span className="template-meta-label">Adds</span>
                  {activeTemplate.adds.map((m) => (
                    <span key={m} className="adds-chip">{m}</span>
                  ))}
                </div>
              )}

              {activeTemplate.usage && (
                <div className="template-usage">
                  <span className="template-meta-label">Usage</span>
                  <code className="template-usage-code">{activeTemplate.usage}</code>
                </div>
              )}

              <div className="template-meta-label template-snippet-label">Snippet</div>
              <pre className="template-snippet">{activeTemplate.snippet}</pre>
            </div>
          </div>
        )}
      </div>
    </section>
  );
};

export default CatalogPanel;
