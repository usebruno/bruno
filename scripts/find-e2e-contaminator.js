#!/usr/bin/env node
/**
 * Bisect which prior test contaminates a victim under --workers=1
 * (shared electronApp / page). Prefer CI timeline input.
 *
 *   node scripts/find-e2e-contaminator.js \
 *     --from-timeline playwright-report/failed-test-predecessors.json --victim-index 0
 *
 * --victim-index N picks failures[N] from that JSON (default 0 = first failure).
 * In failed-test-predecessors.md, headings are "## [N] …" — use that N.
 *
 * Auto-debug: rank failures by predecessor count and bisect the top ones:
 *   node scripts/find-e2e-contaminator.js \
 *     --from-timeline playwright-report/failed-test-predecessors.json --auto-debug
 *
 * Sequences are materialized as numbered copies under tests/.contaminator/ so
 * Playwright runs them in timeline order (CLI file order is alphabetical and
 * cannot recreate worker schedules).
 *
 * Manual (prefer file:line — avoids -g substring false matches):
 *   node scripts/find-e2e-contaminator.js \
 *     --victim tests/foo.spec.ts:42 \
 *     --candidates tests/a.spec.ts:10 tests/b.spec.ts:20
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function usage(code = 1) {
  console.log(`Usage:
  node scripts/find-e2e-contaminator.js --from-timeline <json> [--victim-index N]
  node scripts/find-e2e-contaminator.js --from-timeline <json> --auto-debug [options]
  node scripts/find-e2e-contaminator.js --victim <file[:line]> --candidates <file[:line]|file::title...>

Options:
  --victim-index N      Which failures[N] entry to bisect (default: 0).
                        Matches "## [N]" headings in failed-test-predecessors.md.
                        Each entry is one failed/timed-out attempt (incl. retries).
  --auto-debug          Rank all failures by predecessor count and bisect the
                        ones with the most prior tests on the same worker.
  --min-predecessors N  Auto-debug: only failures with >= N priors (default: 3)
  --limit N             Auto-debug: bisect at most N victims (default: 5)
  --confirm-repeat N    Contaminator→victim confirm runs required to fail (default: 2)
  --project <name>      Playwright project override (default: from timeline / default)
  --repeat-sanity <n>   Victim-alone runs before bisect (default: 1)
  --candidates          Prefer file:line; file::title works as fallback
`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = {
    fromTimeline: null,
    victimIndex: 0,
    victim: null,
    candidates: [],
    project: null,
    repeatSanity: 1,
    confirmRepeat: 2,
    autoDebug: false,
    minPredecessors: 3,
    limit: 5
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') usage(0);
    else if (a === '--from-timeline') args.fromTimeline = argv[++i];
    else if (a === '--victim-index') args.victimIndex = Number(argv[++i]);
    else if (a === '--victim') args.victim = parseLocator(argv[++i]);
    else if (a === '--grep' || a === '-g') {
      console.error('--grep is no longer supported; use --victim file:line (or file::title).');
      usage(1);
    } else if (a === '--project') args.project = argv[++i];
    else if (a === '--repeat-sanity') args.repeatSanity = Number(argv[++i]);
    else if (a === '--confirm-repeat') args.confirmRepeat = Number(argv[++i]);
    else if (a === '--auto-debug') args.autoDebug = true;
    else if (a === '--min-predecessors') args.minPredecessors = Number(argv[++i]);
    else if (a === '--limit') args.limit = Number(argv[++i]);
    else if (a === '--candidates') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        args.candidates.push(parseLocator(argv[++i]));
      }
    } else {
      console.error(`Unknown arg: ${a}`);
      usage(1);
    }
  }
  return args;
}

/** Accept file:line, file::title, or bare file. */
function parseLocator(raw) {
  const titleSep = raw.indexOf('::');
  if (titleSep !== -1) {
    return { file: raw.slice(0, titleSep), title: raw.slice(titleSep + 2), line: null };
  }
  const m = raw.match(/^(.*):(\d+)$/);
  if (m) {
    return { file: m[1], line: Number(m[2]), title: null };
  }
  return { file: raw, line: null, title: null };
}

function locatorArg(loc) {
  if (loc.line) return `${loc.file}:${loc.line}`;
  return loc.file;
}

function loadFailures(timelinePath) {
  const data = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
  const failures = data.failures || [];
  if (!failures.length) throw new Error(`No failures in ${timelinePath}`);
  return failures;
}

function eventToLocator(e) {
  return {
    file: e.file,
    line: e.line || null,
    title: e.title || null,
    project: e.project || 'default',
    retry: e.retry,
    status: e.status
  };
}

function failureToCase(failure, index) {
  const victim = failure.victim;
  const victimKey = `${victim.file}::${victim.title}`;
  // Drop prior attempts of the same test (retries) — they are not foreign contaminators.
  const candidates = (failure.predecessors || [])
    .filter((p) => !p.isVictim)
    .filter((p) => `${p.file}::${p.title}` !== victimKey)
    .map(eventToLocator);

  return {
    index,
    victim: eventToLocator(victim),
    victimTitle: victim.title,
    victimError: victim.error || '',
    project: victim.project || 'default',
    retry: victim.retry,
    candidates,
    predecessorCount: candidates.length,
    rawPredecessorCount: (failure.predecessors || []).filter((p) => !p.isVictim).length
  };
}

function loadFromTimeline(timelinePath, victimIndex) {
  const failures = loadFailures(timelinePath);
  if (victimIndex < 0 || victimIndex >= failures.length) {
    throw new Error(`--victim-index ${victimIndex} out of range (0..${failures.length - 1})`);
  }
  return failureToCase(failures[victimIndex], victimIndex);
}

/**
 * Prefer first-failure attempts (retry 0) when the same victim appears multiple
 * times; otherwise keep the attempt with the most predecessors.
 */
function pickAutoDebugTargets(failures, { minPredecessors, limit }) {
  const ranked = failures
    .map((f, index) => failureToCase(f, index))
    .filter((c) => c.predecessorCount >= minPredecessors)
    .sort((a, b) => b.predecessorCount - a.predecessorCount || a.index - b.index);

  const byVictim = new Map();
  for (const c of ranked) {
    const key = `${c.project}::${c.victim.file}::${c.victimTitle}`;
    const existing = byVictim.get(key);
    if (!existing) {
      byVictim.set(key, c);
      continue;
    }
    if (c.retry < existing.retry) byVictim.set(key, c);
  }

  return [...byVictim.values()]
    .sort((a, b) => b.predecessorCount - a.predecessorCount || a.index - b.index)
    .slice(0, limit);
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function isTimeoutError(error = '') {
  return /test timeout of \d+ms exceeded/i.test(String(error).replace(/\u001b\[[0-9;]*m/g, ''));
}

const ROOT = path.join(__dirname, '..');
const CONTAMINATOR_ROOT = path.join(ROOT, 'tests', '.contaminator');

/**
 * Playwright ignores CLI arg order and runs files alphabetically (then by
 * declaration order within a file). To recreate a worker timeline we copy each
 * selected spec into numbered files 0001.spec.ts, 0002.spec.ts, … under
 * tests/.contaminator/ (must stay inside the project's testDir) and grep by
 * `NNNN.spec.ts.*<title>` so exactly one test runs per step, in order.
 */
function materializeOrderedSequence(locators) {
  if (!locators.every((l) => l.title)) {
    throw new Error('Ordered runs require titles on every locator (re-generate the timeline reporter artifact).');
  }

  fs.mkdirSync(CONTAMINATOR_ROOT, { recursive: true });
  const runDir = fs.mkdtempSync(path.join(CONTAMINATOR_ROOT, 'run-'));
  const stepFiles = [];
  const grepParts = [];

  locators.forEach((loc, i) => {
    const src = path.isAbsolute(loc.file) ? loc.file : path.join(ROOT, loc.file);
    if (!fs.existsSync(src)) {
      throw new Error(`Missing test file: ${loc.file}`);
    }

    const stepName = `${String(i + 1).padStart(4, '0')}.spec.ts`;
    const dest = path.join(runDir, stepName);
    let content = fs.readFileSync(src, 'utf8');

    // Rewrite relative imports for tests/.contaminator/run-*/NNNN.spec.ts
    // (depth to repo root = ../../.., to tests/utils = ../../utils).
    content = content
      .replace(/from (['"])(?:\.\.\/)+playwright\1/g, `from '../../../playwright'`)
      .replace(/from (['"])(?:\.\.\/)+utils\//g, `from '../../utils/`);

    fs.writeFileSync(dest, content);
    stepFiles.push(dest);
    grepParts.push(`${escapeRegex(stepName)}.*${escapeRegex(loc.title)}`);
  });

  return { runDir, stepFiles, grep: grepParts.join('|') };
}

function rmRunDir(runDir) {
  try {
    fs.rmSync(runDir, { recursive: true, force: true });
  } catch { /* ignore */ }
}

/**
 * Run locators in timeline order in one workers=1 process (shared electronApp).
 */
function runSequence(locators, project) {
  if (!locators.length) {
    throw new Error('runSequence requires at least one locator');
  }

  const { runDir, stepFiles, grep } = materializeOrderedSequence(locators);
  const args = [
    'playwright', 'test',
    ...stepFiles.map((f) => path.relative(ROOT, f)),
    '--project', project,
    '--workers=1',
    '--retries=0',
    '--reporter=line',
    '-g', grep
  ];

  console.log(`\n> ordered ${locators.length} step(s) via ${path.relative(ROOT, runDir)}`);
  console.log(`> npx ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`);

  try {
    const result = spawnSync('npx', args, {
      cwd: ROOT,
      stdio: 'inherit',
      env: process.env,
      shell: process.platform === 'win32'
    });
    return result.status === 0;
  } finally {
    rmRunDir(runDir);
  }
}

function formatLoc(loc) {
  if (loc.line) return `${loc.file}:${loc.line}`;
  if (loc.title) return `${loc.file} › ${loc.title}`;
  return loc.file;
}

/**
 * @returns {{
 *   status: 'contaminator'|'alone-fail'|'no-repro'|'bisect-miss'|'no-candidates'|'flaky-confirm',
 *   contaminator?: object,
 *   confirmsFail?: number,
 *   confirmRuns?: number,
 *   alonePasses?: boolean
 * }}
 */
function bisectCase({ victim, project, candidates, repeatSanity, confirmRepeat, victimError }) {
  console.log(`Victim: ${formatLoc(victim)}${victim.title ? ` (${victim.title})` : ''}`);
  console.log(`Project: ${project}`);
  console.log(`Candidates: ${candidates.length}`);
  if (isTimeoutError(victimError)) {
    console.warn(
      '[warn] CI failure was a test timeout, not an assertion. Timeouts often do not ' +
      'reproduce as shared-state contamination (CI load / hung UI). Expect no-repro.'
    );
  }

  for (let i = 0; i < repeatSanity; i++) {
    console.log(`\n=== Sanity ${i + 1}/${repeatSanity}: victim alone ===`);
    if (!runSequence([victim], project)) {
      console.error('Victim fails alone — not contamination (or env not ready).');
      return { status: 'alone-fail' };
    }
  }

  if (candidates.length === 0) {
    console.log('No predecessors/candidates to bisect.');
    return { status: 'no-candidates' };
  }

  console.log('\n=== Reproduce: all candidates then victim (timeline order) ===');
  if (runSequence([...candidates, victim], project)) {
    console.log('Victim still passes after all candidates — no contaminator in this set.');
    if (isTimeoutError(victimError)) {
      console.log('Hint: original error was a timeout; try repeating the victim alone under load, or raise the test timeout.');
    }
    return { status: 'no-repro' };
  }

  let lo = 0;
  let hi = candidates.length;
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    console.log(`\n=== Bisect: first ${mid}/${candidates.length} candidates + victim ===`);
    if (runSequence([...candidates.slice(0, mid), victim], project)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const contaminator = candidates[hi - 1];
  if (!contaminator) {
    console.error('Bisect did not isolate a contaminator.');
    return { status: 'bisect-miss' };
  }

  let failCount = 0;
  for (let i = 0; i < confirmRepeat; i++) {
    console.log(`\n=== Confirm ${i + 1}/${confirmRepeat}: contaminator then victim ===`);
    if (!runSequence([contaminator, victim], project)) failCount++;
  }
  console.log('\n=== Confirm: victim alone again ===');
  const alonePasses = runSequence([victim], project);

  console.log('\n========== RESULT ==========');
  console.log(`Contaminator: ${formatLoc(contaminator)}${contaminator.title ? ` (${contaminator.title})` : ''}`);
  console.log(`Victim:       ${formatLoc(victim)}${victim.title ? ` (${victim.title})` : ''}`);
  console.log(`Confirm contaminator→victim failed: ${failCount}/${confirmRepeat}`);
  console.log(`Confirm victim alone passes:        ${alonePasses}`);

  const confirmed = failCount === confirmRepeat && alonePasses;
  if (failCount > 0 && failCount < confirmRepeat) {
    console.log('Inconsistent confirm — likely a flaky victim, not a stable contaminator.');
    return {
      status: 'flaky-confirm',
      contaminator,
      confirmsFail: failCount,
      confirmRuns: confirmRepeat,
      alonePasses
    };
  }

  if (confirmed) {
    const cArg = locatorArg(contaminator);
    const vArg = locatorArg(victim);
    console.log(`\nnpx playwright test ${cArg} ${vArg} --project=${project} --workers=1`);
  }

  return {
    status: confirmed ? 'contaminator' : 'bisect-miss',
    contaminator,
    confirmsFail: failCount,
    confirmRuns: confirmRepeat,
    alonePasses
  };
}

function runAutoDebug(args) {
  if (!args.fromTimeline) {
    console.error('--auto-debug requires --from-timeline');
    usage(1);
  }

  const failures = loadFailures(args.fromTimeline);
  const targets = pickAutoDebugTargets(failures, {
    minPredecessors: args.minPredecessors,
    limit: args.limit
  });

  console.log(`Auto-debug: ${failures.length} failure attempt(s) in timeline`);
  console.log(`Filter: predecessorCount >= ${args.minPredecessors}, limit ${args.limit}`);
  console.log(`Selected ${targets.length} victim(s) (deduped by file+title, prefer retry 0):\n`);
  targets.forEach((t, i) => {
    const timeoutTag = isTimeoutError(t.victimError) ? ' [timeout]' : '';
    console.log(
      `  ${i + 1}. [failures[${t.index}]] ${formatLoc(t.victim)}` +
      ` (priors=${t.predecessorCount}, retry=${t.retry}, project=${t.project})${timeoutTag}`
    );
  });

  if (targets.length === 0) {
    console.log('Nothing to bisect — lower --min-predecessors or check the timeline.');
    process.exit(0);
  }

  const summary = [];
  for (const target of targets) {
    console.log(`\n\n######## Auto-debug victim-index ${target.index} (${target.predecessorCount} priors) ########\n`);
    const result = bisectCase({
      victim: target.victim,
      project: args.project || target.project,
      candidates: target.candidates,
      repeatSanity: args.repeatSanity,
      confirmRepeat: args.confirmRepeat,
      victimError: target.victimError
    });
    summary.push({
      victimIndex: target.index,
      victim: formatLoc(target.victim),
      predecessorCount: target.predecessorCount,
      status: result.status,
      contaminator: result.contaminator ? formatLoc(result.contaminator) : null
    });
  }

  console.log('\n\n========== AUTO-DEBUG SUMMARY ==========');
  for (const row of summary) {
    const detail = row.contaminator ? ` ← ${row.contaminator}` : '';
    console.log(
      `[${row.victimIndex}] priors=${row.predecessorCount} ${row.status}: ${row.victim}${detail}`
    );
  }

  const found = summary.filter((r) => r.status === 'contaminator').length;
  process.exit(found > 0 ? 0 : 4);
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.autoDebug) {
    runAutoDebug(args);
    return;
  }

  let testCase;
  if (args.fromTimeline) {
    testCase = loadFromTimeline(args.fromTimeline, args.victimIndex);
  } else if (args.victim) {
    if (!args.candidates.length) {
      console.error('--victim requires --candidates (or use --from-timeline)');
      usage(1);
    }
    testCase = {
      victim: args.victim,
      project: args.project || 'default',
      candidates: args.candidates
    };
  } else {
    usage(1);
  }

  const result = bisectCase({
    victim: testCase.victim,
    project: args.project || testCase.project,
    candidates: testCase.candidates,
    repeatSanity: args.repeatSanity,
    confirmRepeat: args.confirmRepeat,
    victimError: testCase.victimError
  });

  if (result.status === 'alone-fail') process.exit(2);
  if (result.status === 'bisect-miss' || result.status === 'flaky-confirm') process.exit(3);
  process.exit(0);
}

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
