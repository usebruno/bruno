import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import { IconTrash, IconPlayerPlay, IconPlus } from '@tabler/icons';
import { LOCAL_SCRIPT_NAME_PATTERN } from '@usebruno/common/utils';
import Button from 'ui/Button';
import StyledWrapper from './StyledWrapper';
import { saveLocalScripts } from 'providers/ReduxStore/slices/local-scripts';

const DEFAULT_TIMEOUT_MS = 30000;

const toRows = (commands) =>
  (Array.isArray(commands) ? commands : []).map((row) => ({
    name: row.name || '',
    command: row.command || '',
    timeout: row.timeout ? String(row.timeout) : ''
  }));

const WorkspaceLocalScripts = () => {
  const dispatch = useDispatch();
  const commands = useSelector((state) => state.localScripts?.commands || []);
  const [rows, setRows] = useState(() => toRows(commands));
  const [syncedCommands, setSyncedCommands] = useState(commands);
  const [testStates, setTestStates] = useState({});
  const [saving, setSaving] = useState(false);

  // The registry is loaded from the main process after mount, so adopt store
  // changes into the editable rows (resetting them to the saved contents).
  if (commands !== syncedCommands) {
    setSyncedCommands(commands);
    setRows(toRows(commands));
  }

  const patchRow = (index, patch) => {
    setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
  };

  const addRow = () => {
    setRows((current) => [...current, { name: '', command: '', timeout: '' }]);
  };

  const removeRow = (index) => {
    setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
    setTestStates((current) => {
      const next = { ...current };
      delete next[index];
      return next;
    });
  };

  const validateRows = (rowsToValidate) => {
    const names = new Set();
    for (const row of rowsToValidate) {
      const name = row.name.trim();
      if (!LOCAL_SCRIPT_NAME_PATTERN.test(name)) {
        return `Invalid script name "${row.name}". Use letters, digits, "_", ".", "-" and start with a letter, digit or "_".`;
      }
      if (names.has(name)) {
        return `Duplicate script name "${name}".`;
      }
      names.add(name);
      if (!row.command.trim()) {
        return `Script "${name}" is missing a command.`;
      }
      if (row.timeout.trim() !== '') {
        const timeout = Number(row.timeout);
        if (!Number.isFinite(timeout) || timeout <= 0) {
          return `Timeout for "${name}" must be a positive number of milliseconds.`;
        }
      }
    }
    return null;
  };

  const toConfig = (rowsToSave) =>
    rowsToSave.map((row) => {
      const command = { name: row.name.trim(), command: row.command.trim() };
      if (row.timeout.trim() !== '') {
        command.timeout = Number(row.timeout);
      }
      return command;
    });

  const handleSave = async () => {
    const error = validateRows(rows);
    if (error) {
      toast.error(error);
      return;
    }

    setSaving(true);
    try {
      await dispatch(saveLocalScripts(toConfig(rows)));
      toast.success('Local scripts saved');
    } catch (err) {
      toast.error(err.message || 'Failed to save local scripts');
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async (index) => {
    const row = rows[index];
    const error = validateRows([row]);
    if (error) {
      toast.error(error);
      return;
    }

    const script = { name: row.name.trim(), command: row.command.trim() };
    if (row.timeout.trim() !== '') {
      script.timeout = Number(row.timeout);
    }

    setTestStates((current) => ({ ...current, [index]: { running: true } }));
    try {
      const result = await window.ipcRenderer.invoke('renderer:run-local-script', { script });
      setTestStates((current) => ({
        ...current,
        [index]: {
          running: false,
          ok: true,
          stdout: result.stdout,
          stderr: result.stderr,
          duration: result.duration
        }
      }));
    } catch (err) {
      setTestStates((current) => ({
        ...current,
        [index]: { running: false, ok: false, error: err.message, stderr: err.stderr }
      }));
    }
  };

  const renderTestOutput = (state) => {
    if (!state || state.running) {
      return state?.running ? <div className="px-3 py-2 test-output">Running…</div> : null;
    }
    if (!state.ok) {
      return (
        <div className="px-3 py-2 test-output" data-testid="local-script-test-error">
          {state.error}
          {state.stderr ? `\n${state.stderr}` : ''}
        </div>
      );
    }
    return (
      <div className="px-3 py-2 test-output">
        exit 0 · {state.duration}ms
        {'\n'}
        stdout: {state.stdout || '(empty)'}
        {state.stderr ? `\nstderr: ${state.stderr}` : ''}
      </div>
    );
  };

  return (
    <StyledWrapper>
      <div className="page-header">
        <div className="title">Local Scripts</div>
        <div className="subtitle">
          Shell commands defined once and referenceable from every collection as <code>{'{{$script:name}}'}</code>
        </div>
      </div>

      <div className="content">
        <div className="mb-3 warning-box px-3 py-2 text-sm" data-testid="local-scripts-warning">
          Commands run on your machine with your shell (working directory: your home folder). Execution is off unless
          you enable it in Preferences → General → “Allow Local Scripts” (CLI: <code>--allow-local-scripts</code>).
          Only register commands you trust.
        </div>

        <div className="flex-1 overflow-auto">
          <div className="flex items-center gap-3 text-xs text-muted font-medium px-2 pb-1">
            <div className="w-48">Name</div>
            <div className="flex-1">Command</div>
            <div className="w-28">Timeout (ms)</div>
            <div className="w-20" />
          </div>
          {rows.length === 0 && (
            <div className="px-2 py-4 text-sm text-muted italic">No local scripts registered.</div>
          )}
          {rows.map((row, index) => {
            const output = renderTestOutput(testStates[index]);
            return (
              <div key={index} className="script-row py-2">
                <div className="flex items-center gap-3 px-2">
                  <input
                    type="text"
                    className="textbox w-48"
                    placeholder="get-token"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-testid={`local-script-name-${index}`}
                    value={row.name}
                    onChange={(e) => patchRow(index, { name: e.target.value })}
                  />
                  <input
                    type="text"
                    className="textbox flex-1"
                    placeholder={`node "$HOME/.bruno/scripts/${row.name.trim() || 'get-token'}.js"`}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-testid={`local-script-command-${index}`}
                    value={row.command}
                    onChange={(e) => patchRow(index, { command: e.target.value })}
                  />
                  <input
                    type="text"
                    className="textbox w-28"
                    placeholder={String(DEFAULT_TIMEOUT_MS)}
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    data-testid={`local-script-timeout-${index}`}
                    value={row.timeout}
                    onChange={(e) => patchRow(index, { timeout: e.target.value })}
                  />
                  <div className="w-20 flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleTest(index)}
                      data-testid={`local-script-test-${index}`}
                    >
                      <IconPlayerPlay size={14} strokeWidth={1.5} />
                    </Button>
                    <button
                      type="button"
                      className="btn-close text-muted hover:text-red-500 p-1"
                      aria-label="Remove local script"
                      data-testid={`local-script-remove-${index}`}
                      onClick={() => removeRow(index)}
                    >
                      <IconTrash size={16} strokeWidth={1.5} />
                    </button>
                  </div>
                </div>
                {output && (
                  <div className="px-2 pt-2">{output}</div>
                )}
              </div>
            );
          })}
        </div>

        <div className="flex items-center gap-3 mt-4">
          <Button size="sm" variant="outline" onClick={addRow} data-testid="local-script-add">
            <span className="flex items-center gap-1">
              <IconPlus size={14} strokeWidth={1.5} />
              Add Script
            </span>
          </Button>
          <Button type="submit" size="sm" onClick={handleSave} disabled={saving} data-testid="local-script-save">
            {saving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      </div>
    </StyledWrapper>
  );
};

export default WorkspaceLocalScripts;
