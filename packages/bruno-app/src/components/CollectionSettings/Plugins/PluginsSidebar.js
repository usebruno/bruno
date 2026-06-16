import React, { useEffect, useRef, useState } from 'react';
import { IconBook, IconChevronDown, IconCode, IconPlus, IconStack2 } from '@tabler/icons';
import PluginRow from './PluginRow';

const AddPluginMenu = ({ onBrowseCatalog, onPickTemplate, onAddEmpty }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const onClick = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, [open]);

  const choose = (handler) => () => {
    setOpen(false);
    handler();
  };

  return (
    <div className="add-menu" ref={wrapperRef}>
      <button
        type="button"
        className="add-menu-trigger"
        onClick={() => setOpen((v) => !v)}
        data-testid="plugins-add-trigger"
      >
        <IconPlus size={14} strokeWidth={2} />
        <span>Add plugin</span>
        <IconChevronDown size={14} strokeWidth={2} />
      </button>
      {open && (
        <div className="add-menu-pop">
          <button type="button" onClick={choose(onBrowseCatalog)}>
            <IconBook size={14} strokeWidth={1.75} />
            <span>
              <span className="menu-item-title">Browse catalog</span>
              <span className="menu-item-sub">Curated chai plugins</span>
            </span>
          </button>
          <button type="button" onClick={choose(onPickTemplate)}>
            <IconStack2 size={14} strokeWidth={1.75} />
            <span>
              <span className="menu-item-title">Insert template</span>
              <span className="menu-item-sub">Custom matchers, async, partials</span>
            </span>
          </button>
          <button type="button" onClick={choose(onAddEmpty)}>
            <IconCode size={14} strokeWidth={1.75} />
            <span>
              <span className="menu-item-title">Empty plugin</span>
              <span className="menu-item-sub">Start from a blank scaffold</span>
            </span>
          </button>
        </div>
      )}
    </div>
  );
};

const PluginsSidebar = ({
  plugins,
  activeUid,
  validationState,
  onSelect,
  onMove,
  onBrowseCatalog,
  onPickTemplate,
  onAddEmpty
}) => {
  return (
    <aside className="plugins-sidebar">
      <div className="sidebar-head">
        <span className="sidebar-title">Plugins</span>
        <span className="sidebar-count">{plugins.length}</span>
      </div>
      <ul className="plugins-list">
        {plugins.map((plugin, index) => (
          <PluginRow
            key={plugin.uid}
            plugin={plugin}
            index={index}
            isActive={plugin.uid === activeUid}
            validationState={validationState}
            onSelect={onSelect}
            onMove={onMove}
          />
        ))}
      </ul>
      <div className="sidebar-foot">
        <AddPluginMenu
          onBrowseCatalog={onBrowseCatalog}
          onPickTemplate={onPickTemplate}
          onAddEmpty={onAddEmpty}
        />
      </div>
    </aside>
  );
};

export default PluginsSidebar;
