import React, { useEffect } from 'react';
import { useSelector } from 'react-redux';
import get from 'lodash/get';
import { IconCheck, IconAlertCircle, IconTrash, IconPlayerPlay } from '@tabler/icons';
import CodeEditor from 'components/CodeEditor';
import StatusBadge from 'ui/StatusBadge';
import Button from 'ui/Button';
import { useTheme } from 'providers/Theme';
import { validatePlugin, usesRequire } from './validatePlugin';
import { COMPAT_META } from './catalog';

const formatRelativeTime = (date) => {
  if (!date) return '';
  const diff = Math.max(0, Date.now() - new Date(date).getTime());
  if (diff < 5000) return 'just now';
  if (diff < 60000) return `${Math.floor(diff / 1000)}s ago`;
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  return new Date(date).toLocaleTimeString();
};

const PluginDetail = ({
  plugin,
  collection,
  onChange,
  onDelete,
  onSave,
  validation,
  onValidate
}) => {
  const { displayedTheme } = useTheme();
  const preferences = useSelector((state) => state.app.preferences);

  const compat = usesRequire(plugin.code || '') ? 'node-only' : 'pure-js';
  const compatMeta = COMPAT_META[compat];

  const handleValidate = async () => {
    const result = await validatePlugin(plugin.code || '');
    onValidate(plugin.uid, result);
  };

  // Cmd/Ctrl+Enter to validate when editor is focused inside the detail pane
  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        const detail = document.getElementById('plugin-detail-pane');
        if (detail && detail.contains(document.activeElement)) {
          e.preventDefault();
          handleValidate();
        }
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  });

  return (
    <section id="plugin-detail-pane" className="plugin-detail">
      <header className="detail-head">
        <input
          className="detail-name"
          type="text"
          value={plugin.name || ''}
          placeholder="plugin name"
          onChange={(e) => onChange({ name: e.target.value })}
          data-testid="plugin-detail-name"
        />
        <div className="detail-head-actions">
          <Button
            type="button"
            size="sm"
            color="secondary"
            variant="outline"
            icon={<IconPlayerPlay size={14} strokeWidth={1.75} />}
            onClick={handleValidate}
            data-testid="plugin-detail-validate"
          >
            Validate
          </Button>
          <Button
            type="button"
            size="sm"
            color="primary"
            onClick={onSave}
            data-testid="plugin-detail-save"
          >
            Save
          </Button>
          <button
            type="button"
            className="detail-delete"
            onClick={onDelete}
            title="Delete plugin"
            data-testid="plugin-detail-delete"
          >
            <IconTrash size={15} strokeWidth={1.5} />
          </button>
        </div>
      </header>

      <div className="detail-meta">
        <button
          type="button"
          className={`meta-toggle-btn ${plugin.enabled !== false ? 'on' : 'off'}`}
          onClick={() => onChange({ enabled: !(plugin.enabled !== false) })}
          aria-pressed={plugin.enabled !== false}
          data-testid="plugin-detail-toggle"
        >
          <span className="meta-toggle-track">
            <span className="meta-toggle-thumb" />
          </span>
          <span className="meta-toggle-label">
            {plugin.enabled !== false ? 'Enabled' : 'Disabled'}
          </span>
        </button>
        <StatusBadge status={compatMeta.status} variant="light" size="xs">
          {compatMeta.label}
        </StatusBadge>
      </div>

      <div className="detail-editor-wrap">
        <CodeEditor
          collection={collection}
          value={plugin.code || ''}
          theme={displayedTheme}
          onEdit={(value) => onChange({ code: value })}
          mode="javascript"
          onSave={onSave}
          font={get(preferences, 'font.codeFont', 'default')}
          fontSize={get(preferences, 'font.codeFontSize')}
        />
      </div>

      <footer className={`detail-foot ${validation ? (validation.ok ? 'ok' : 'err') : 'idle'}`}>
        {!validation && (
          <span>
            Press <kbd>⌘</kbd>/<kbd>Ctrl</kbd> + <kbd>Enter</kbd> in the editor to validate.
          </span>
        )}
        {validation && validation.ok && (
          <>
            <IconCheck size={14} strokeWidth={2} />
            <span>Parse OK · {formatRelativeTime(validation.at)}</span>
          </>
        )}
        {validation && !validation.ok && (
          <>
            <IconAlertCircle size={14} strokeWidth={2} />
            <span className="err-msg">{validation.message}</span>
          </>
        )}
      </footer>
    </section>
  );
};

export default PluginDetail;
