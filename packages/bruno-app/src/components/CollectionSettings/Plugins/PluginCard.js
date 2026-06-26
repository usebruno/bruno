import React, { useRef } from 'react';
import { useSelector } from 'react-redux';
import { useDrag, useDrop } from 'react-dnd';
import get from 'lodash/get';
import {
  IconGripVertical,
  IconCheck,
  IconAlertCircle,
  IconTrash,
  IconPlayerPlay,
  IconDownload,
  IconLoader2,
  IconChevronDown,
  IconChevronRight
} from '@tabler/icons';
import CodeEditor from 'components/CodeEditor';
import { useTheme } from 'providers/Theme';
import { validatePlugin, extractAddedAssertions, extractRequiredPackages } from './validatePlugin';

const DRAG_TYPE = 'bruno-plugin-card';

const formatRelativeTime = (date) => {
  if (!date) return '';
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(date).toLocaleTimeString();
};

const PluginCard = ({
  plugin,
  index,
  collection,
  validation,
  installedMap,
  installingPackages,
  expanded,
  onToggleExpanded,
  onChange,
  onDelete,
  onMove,
  onValidate,
  onInstallPackage
}) => {
  const ref = useRef(null);
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const [{ isOver }, drop] = useDrop({
    accept: DRAG_TYPE,
    hover(item) {
      if (item.uid === plugin.uid) return;
      onMove(item.uid, plugin.uid);
    },
    collect: (monitor) => ({ isOver: monitor.isOver() })
  });
  const [{ isDragging }, drag, dragPreview] = useDrag({
    type: DRAG_TYPE,
    item: { uid: plugin.uid, index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
    options: { dropEffect: 'move' }
  });
  dragPreview(drop(ref));

  const enabled = plugin.enabled !== false;
  const code = plugin.code || '';
  const added = extractAddedAssertions(code);
  const requiredPkgs = extractRequiredPackages(code);
  const missingPkgs = requiredPkgs.filter((p) => installedMap?.[p] === false);
  const hasInstallable = requiredPkgs.length > 0;

  const statusPill = (() => {
    if (!enabled) return { className: 'muted', icon: null, label: 'Disabled' };
    if (validation?.ok === false) {
      return { className: 'err', icon: <IconAlertCircle size={11} strokeWidth={2} />, label: 'Parse error' };
    }
    if (missingPkgs.length > 0) {
      return { className: 'warn', icon: <IconAlertCircle size={11} strokeWidth={2} />, label: 'Needs install' };
    }
    if (validation?.ok) {
      return { className: 'ok', icon: <IconCheck size={11} strokeWidth={2.5} />, label: 'Validated' };
    }
    return { className: 'idle', icon: null, label: 'Active' };
  })();

  const handleValidate = async () => {
    const result = await validatePlugin(code);
    onValidate(plugin.uid, result);
  };

  return (
    <div
      ref={ref}
      className={`plugin-card${isDragging ? ' dragging' : ''}${isOver ? ' drop-target' : ''}${!enabled ? ' off' : ''}`}
    >
      <header className="card-head">
        <span ref={drag} className="card-grip" title="Drag to reorder">
          <IconGripVertical size={14} strokeWidth={1.5} />
        </span>

        <button
          type="button"
          className="card-collapse"
          onClick={() => onToggleExpanded(plugin.uid)}
          aria-expanded={expanded}
          title={expanded ? 'Collapse' : 'Expand'}
        >
          {expanded
            ? <IconChevronDown size={14} strokeWidth={2} />
            : <IconChevronRight size={14} strokeWidth={2} />}
        </button>

        <input
          className="card-name"
          type="text"
          value={plugin.name || ''}
          placeholder="plugin name"
          onChange={(e) => onChange({ name: e.target.value })}
          spellCheck="false"
          data-testid={`plugin-card-name-${plugin.uid}`}
        />

        <span className={`card-pill ${statusPill.className}`}>
          {statusPill.icon}
          {statusPill.label}
        </span>

        <button
          type="button"
          className={`mini-toggle ${enabled ? 'on' : 'off'}`}
          onClick={() => onChange({ enabled: !enabled })}
          aria-pressed={enabled}
          title={enabled ? 'Disable plugin' : 'Enable plugin'}
        >
          <span className="mini-toggle-track">
            <span className="mini-toggle-thumb" />
          </span>
        </button>

        <button
          type="button"
          className="card-icon-btn danger"
          onClick={() => onDelete(plugin.uid)}
          title="Delete plugin"
        >
          <IconTrash size={14} strokeWidth={1.5} />
        </button>
      </header>

      {added.length > 0 && (
        <div className="card-adds">
          <span className="adds-label">Adds:</span>
          {added.map((name) => (
            <code className="adds-chip" key={name}>.{name}()</code>
          ))}
        </div>
      )}

      {missingPkgs.length > 0 && (
        <div className="card-warn-row">
          <IconAlertCircle size={12} strokeWidth={2} />
          <span>
            Needs npm install:&nbsp;
            {missingPkgs.map((pkg, i) => (
              <React.Fragment key={pkg}>
                <code>{pkg}</code>
                {i < missingPkgs.length - 1 ? ', ' : null}
              </React.Fragment>
            ))}
          </span>
          <button
            type="button"
            className="card-link-btn"
            onClick={() => onInstallPackage(missingPkgs)}
            disabled={missingPkgs.some((p) => installingPackages?.[p])}
          >
            {missingPkgs.some((p) => installingPackages?.[p])
              ? <><IconLoader2 size={12} strokeWidth={2} className="spin" />Installing…</>
              : <><IconDownload size={12} strokeWidth={2} />Install</>}
          </button>
        </div>
      )}

      {expanded && (
        <div className="card-body">
          <div className="card-editor-wrap">
            <CodeEditor
              collection={collection}
              value={code}
              theme={displayedTheme}
              onEdit={(value) => onChange({ code: value })}
              mode="javascript"
              font={get(preferences, 'font.codeFont', 'default')}
              fontSize={get(preferences, 'font.codeFontSize')}
            />
          </div>
          <div className="card-foot">
            <button
              type="button"
              className="card-link-btn primary"
              onClick={handleValidate}
            >
              <IconPlayerPlay size={12} strokeWidth={1.75} />
              Validate
            </button>
            {validation && validation.ok && (
              <span className="foot-status ok">
                <IconCheck size={12} strokeWidth={2} />
                Parse OK · {formatRelativeTime(validation.at)}
              </span>
            )}
            {validation && !validation.ok && (
              <span className="foot-status err">
                <IconAlertCircle size={12} strokeWidth={2} />
                {validation.message}
              </span>
            )}
            {!validation && hasInstallable && (
              <span className="foot-status hint">
                {requiredPkgs.length} npm import{requiredPkgs.length === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PluginCard;
