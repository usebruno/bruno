import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'react-redux';
import toast from 'react-hot-toast';
import {
  IconPlayerRecord,
  IconPlayerStop,
  IconRefresh,
  IconDownload,
  IconCopy,
  IconFileImport,
  IconX
} from '@tabler/icons';
import StyledWrapper from './StyledWrapper';
import MetricTable from './MetricTable';
import SummaryCards from './SummaryCards';
import Insights from './Insights';
import { fmtMs, fmtNum, fmtPct, fmtRatio } from './format';
import {
  buildExport,
  getProfilerSnapshot,
  isProfilerEnabled,
  measureStateSize,
  parseExport,
  resetProfiler,
  setProfilerEnabled
} from 'utils/profiler';

const POLL_MS = 500;
const BUILD_MODE = import.meta.env?.MODE;

// Anything above this in a single call is a frame budget blown on its own.
const HOT_MS = 8;
const isHotByMax = (r) => r.max >= HOT_MS;

const DISPATCH_COLUMNS = [
  { key: 'name', label: 'action' },
  { key: 'count', label: 'count', num: true, format: fmtNum, delta: true },
  { key: 'renders', label: 'renders', num: true, format: fmtNum, delta: true, title: 'Component renders committed after this action' },
  { key: 'rendersPerDispatch', label: 'renders/disp', num: true, format: fmtRatio, delta: true },
  { key: 'total', label: 'total ms', num: true, format: fmtMs, delta: true },
  { key: 'inner', label: 'reducer', num: true, format: fmtMs },
  {
    key: 'overhead',
    label: 'middleware',
    num: true,
    format: fmtMs,
    render: (r) => (
      <>
        {fmtMs(r.overhead || 0)} <span className="pct">({r.total > 0 ? Math.round((r.overhead / r.total) * 100) : 0}%)</span>
      </>
    )
  },
  { key: 'max', label: 'max', num: true, format: fmtMs },
  {
    key: 'topComponents',
    label: 'top renders',
    render: (r) => (r.topComponents || []).map((c) => `${c.component} ×${c.count}`).join(', '),
    tooltip: (r) => (r.topComponents || []).map((c) => `${c.component} ×${c.count}`).join('\n')
  }
];

// "collections/requestUrlChanged: 6/dispatch (all 6 mounted)"
const describeCause = (a, mounted) => {
  if (a.perDispatch === null || a.perDispatch === undefined) return `${a.action} ×${a.count}`;
  const per = fmtRatio(a.perDispatch);
  if (mounted > 1) {
    const share = Math.round(a.perDispatch) >= mounted ? `all ${mounted} mounted` : `of ${mounted} mounted`;
    return `${a.action}: ${per}/dispatch (${share})`;
  }
  return `${a.action}: ${per}/dispatch`;
};

const RENDER_COLUMNS = [
  { key: 'name', label: 'component' },
  { key: 'count', label: 'renders', num: true, format: fmtNum, delta: true },
  {
    key: 'instancesRendered',
    label: 'instances',
    num: true,
    format: fmtNum,
    title: 'Distinct instances that rendered during the recording, of how many are mounted now',
    render: (r) => (r.instancesRendered !== undefined ? `${fmtNum(r.instancesRendered)} of ${fmtNum(r.mounted || 0)}` : '')
  },
  {
    key: 'sameProps',
    label: 'same props',
    num: true,
    format: fmtNum,
    delta: true,
    title: 'Renders where no tracked prop changed identity, the usual sign of a wasted render',
    render: (r) => (r.compared ? <>{fmtNum(r.sameProps)} <span className="pct">({fmtPct(r.sameProps / r.compared)})</span></> : '')
  },
  { key: 'total', label: 'total ms', num: true, format: fmtMs, delta: true },
  { key: 'mean', label: 'mean', num: true, format: fmtMs },
  { key: 'max', label: 'max', num: true, format: fmtMs },
  {
    key: 'propChanges',
    label: 'changing props',
    title: 'Props that changed identity, by how many renders they changed in',
    render: (r) => (r.propChanges || []).slice(0, 3).map((p) => `${p.prop} ×${p.count}`).join(', '),
    tooltip: (r) => (r.propChanges || []).map((p) => `${p.prop} ×${p.count}`).join('\n')
  },
  {
    key: 'topActions',
    label: 'caused by',
    title: 'Renders per action. "6/dispatch, 6 of 6 mounted" means every mounted instance re-rendered on each dispatch',
    render: (r) => (r.topActions || []).slice(0, 2).map((a) => describeCause(a, r.mounted)).join(' · '),
    tooltip: (r) => (r.topActions || []).map((a) => describeCause(a, r.mounted)).join('\n')
  }
];

const SELECTOR_COLUMNS = [
  { key: 'name', label: 'selector' },
  { key: 'count', label: 'calls', num: true, format: fmtNum, delta: true },
  { key: 'recomputes', label: 'recomputes', num: true, format: fmtNum, delta: true },
  { key: 'hitRate', label: 'hit rate', num: true, format: fmtPct, delta: true, higherIsBetter: true },
  { key: 'instances', label: 'instances', num: true, format: fmtNum, delta: true, title: 'Selector objects created, ≈ renders means it is rebuilt every render' },
  { key: 'total', label: 'total ms', num: true, format: fmtMs, delta: true }
];

const FN_COLUMNS = [
  { key: 'name', label: 'function' },
  { key: 'count', label: 'calls', num: true, format: fmtNum, delta: true },
  { key: 'total', label: 'total ms', num: true, format: fmtMs, delta: true },
  { key: 'mean', label: 'mean', num: true, format: fmtMs },
  { key: 'max', label: 'max', num: true, format: fmtMs }
];

const fileSafe = (s) => (s || 'run').trim().replace(/[^a-z0-9-_]+/gi, '-').slice(0, 40);

// Warn when two runs are not measuring the same thing.
const compareWarnings = (current, baseline) => {
  const warnings = [];
  if (baseline.meta.mode && current.mode && baseline.meta.mode !== current.mode) {
    warnings.push(`baseline is a ${baseline.meta.mode} build, this is ${current.mode}`);
  }
  const a = baseline.meta.stateSize;
  const b = current.stateSize;
  if (a && b && (a.requests !== b.requests || a.collections !== b.collections)) {
    warnings.push(`baseline had ${a.collections} collections / ${a.requests} requests, now ${b.collections} / ${b.requests}`);
  }
  return warnings;
};

const ProfilerTab = () => {
  const store = useStore();
  const [snapshot, setSnapshot] = useState(() => getProfilerSnapshot());
  const [recording, setRecording] = useState(() => isProfilerEnabled());
  const [scenario, setScenario] = useState('');
  const [label, setLabel] = useState('');
  const [baseline, setBaseline] = useState(null);
  // Computed once when a baseline is loaded: measuring state walks the whole tree, so
  // doing it on every poll would distort the numbers being compared.
  const [warnings, setWarnings] = useState([]);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const timer = setInterval(() => setSnapshot(getProfilerSnapshot()), POLL_MS);
    return () => clearInterval(timer);
  }, []);

  const toggleRecording = useCallback(() => {
    const next = !isProfilerEnabled();
    setProfilerEnabled(next);
    setRecording(next);
    setSnapshot(getProfilerSnapshot());
  }, []);

  const handleReset = useCallback(() => {
    resetProfiler();
    setSnapshot(getProfilerSnapshot());
  }, []);

  const makeExport = () => buildExport({ scenario, label, mode: BUILD_MODE, state: store.getState() });

  const handleDownload = () => {
    const data = makeExport();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const stamp = data.meta.exportedAt.replace(/[:.]/g, '-').slice(0, 19);
    a.href = url;
    a.download = `profiler-${fileSafe(scenario)}-${fileSafe(label)}-${stamp}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify(makeExport(), null, 2));
      toast.success('Profiler snapshot copied');
    } catch (err) {
      toast.error(`Copy failed: ${err.message}`);
    }
  };

  const handleLoadBaseline = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = parseExport(String(reader.result));
        setBaseline(data);
        setWarnings(compareWarnings({ mode: BUILD_MODE, stateSize: measureStateSize(store.getState()) }, data));
        if (!scenario && data.meta.scenario) setScenario(data.meta.scenario);
      } catch (err) {
        toast.error(err.message);
      }
    };
    reader.readAsText(file);
  };

  const handleClearBaseline = () => {
    setBaseline(null);
    setWarnings([]);
  };

  const { totals, dispatches, renders, selectors, fns, elapsedMs } = snapshot;
  const base = baseline?.snapshot;
  const hasData = totals.dispatches > 0 || renders.length > 0 || fns.length > 0 || selectors.length > 0;

  return (
    <StyledWrapper>
      <div className="tab-content">
        <div className="profiler-toolbar">
          <button
            className={`profiler-btn ${recording ? 'recording' : ''}`}
            onClick={toggleRecording}
            data-testid="profiler-record"
          >
            {recording ? <IconPlayerStop size={13} /> : <IconPlayerRecord size={13} />}
            <span>{recording ? 'Stop' : 'Record'}</span>
          </button>

          <button className="profiler-btn" onClick={handleReset} disabled={!hasData} data-testid="profiler-reset">
            <IconRefresh size={13} strokeWidth={1.5} />
            <span>Reset</span>
          </button>

          <span className="toolbar-sep" />

          <input
            className="profiler-input"
            placeholder="scenario (e.g. S1-type-url)"
            value={scenario}
            onChange={(e) => setScenario(e.target.value)}
            data-testid="profiler-scenario"
          />
          <input
            className="profiler-input"
            placeholder="label (e.g. main, pr-9290)"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            data-testid="profiler-label"
          />

          <button className="profiler-btn" onClick={handleDownload} disabled={!hasData} data-testid="profiler-export">
            <IconDownload size={13} strokeWidth={1.5} />
            <span>Export</span>
          </button>
          <button className="profiler-btn" onClick={handleCopy} disabled={!hasData} title="Copy snapshot JSON">
            <IconCopy size={13} strokeWidth={1.5} />
          </button>

          {baseline ? (
            <button className="profiler-btn" onClick={handleClearBaseline} data-testid="profiler-clear-baseline">
              <IconX size={13} strokeWidth={1.5} />
              <span>Clear baseline</span>
            </button>
          ) : (
            <button className="profiler-btn" onClick={() => fileInputRef.current?.click()} data-testid="profiler-load-baseline">
              <IconFileImport size={13} strokeWidth={1.5} />
              <span>Load baseline</span>
            </button>
          )}
          <input ref={fileInputRef} type="file" accept="application/json,.json" hidden onChange={handleLoadBaseline} />

          <div className="toolbar-stats">
            <span>recording <b>{(elapsedMs / 1000).toFixed(0)}s</b></span>
          </div>
        </div>

        <div className="profiler-body">
          {baseline ? (
            <div className="baseline-banner" data-testid="profiler-baseline-banner">
              Comparing against <b>{baseline.meta.scenario || 'unnamed scenario'}</b>
              {baseline.meta.label ? <> · <b>{baseline.meta.label}</b></> : null}
              {' · '}{new Date(baseline.meta.exportedAt).toLocaleString()}
              {baseline.meta.mode ? ` · ${baseline.meta.mode}` : null}
              {warnings.map((w) => (
                <div key={w} className="warning">⚠ {w}</div>
              ))}
            </div>
          ) : null}

          <section>
            <h4 className="panel-title">Insights</h4>
            <p className="panel-note">
              Patterns in this recording that usually mean wasted work, worst first. They are leads to
              check, not verdicts, each one says what was measured and where to look.
            </p>
            <Insights snapshot={snapshot} baseline={base} />
          </section>

          <section>
            <h4 className="panel-title">Summary</h4>
            <p className="panel-note">
              Top-level dispatches only, actions dispatched from inside another are counted in the table but not
              here. Thunks are not timed; the actions they dispatch are.
            </p>
            <SummaryCards snapshot={snapshot} baseline={base} />
          </section>

          <section>
            <h4 className="panel-title">Dispatches</h4>
            <p className="panel-note">
              <b>total</b> is the whole dispatch. <b>reducer</b> is the reducer and Immer alone.
              <b> middleware</b> is everything in between, in a development build that is mostly
              RTK&apos;s immutableCheck and serializableCheck, which deep-walk the entire state tree
              twice per action and are compiled out of production builds. <b>renders</b> are the
              component renders committed after the action; several actions batched into one commit
              are credited to the last.
            </p>
            <MetricTable rows={dispatches} baselineRows={base?.dispatches} columns={DISPATCH_COLUMNS} isHot={isHotByMax} testId="profiler-dispatches" />
          </section>

          <section>
            <h4 className="panel-title">Renders</h4>
            <p className="panel-note">
              Committed renders of instrumented components. Times are inclusive, a parent includes
              every child rendered in the same commit, so don&apos;t add them together.
              <b> same props</b> counts renders where none of the props it receives changed; components
              without props are left blank.
              {totals.unattributedRenders ? ` ${fmtNum(totals.unattributedRenders)} renders had no action (local state, timers).` : ''}
            </p>
            <MetricTable rows={renders} baselineRows={base?.renders} columns={RENDER_COLUMNS} isHot={isHotByMax} testId="profiler-renders" />
          </section>

          <section>
            <h4 className="panel-title">Selectors</h4>
            <p className="panel-note">
              Instrumented memoised selectors. react-redux runs every subscribed selector on every
              dispatch, so <b>calls</b> is work done even when nothing re-renders. A low <b>hit rate</b>
              means the memoisation isn&apos;t holding.
            </p>
            <MetricTable rows={selectors} baselineRows={base?.selectors} columns={SELECTOR_COLUMNS} testId="profiler-selectors" />
          </section>

          <section>
            <h4 className="panel-title">Hot functions</h4>
            <p className="panel-note">
              Instrumented collection helpers. Timings nest, findItemInCollection includes the
              flattenItems call inside it, so don&apos;t add the totals together.
            </p>
            <MetricTable rows={fns} baselineRows={base?.fns} columns={FN_COLUMNS} isHot={isHotByMax} testId="profiler-functions" />
          </section>

        </div>
      </div>
    </StyledWrapper>
  );
};

export default ProfilerTab;
