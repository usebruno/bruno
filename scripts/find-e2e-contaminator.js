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
 *   node scripts/find-e2e-contaminator.js \
 *     --victim tests/foo.spec.ts --grep 'title' \
 *     --candidates tests/a.spec.ts::'test A' tests/b.spec.ts::'test B'
 */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

function usage(code = 1) {
  console.log(`Usage:
  node scripts/find-e2e-contaminator.js --from-timeline <failed-test-predecessors.json> [--victim-index N]
  node scripts/find-e2e-contaminator.js --victim <file> --grep <title> --candidates <file::title...> [--project default]

Options:
  --victim-index N      Which failures[N] entry to bisect (default: 0).
                        Matches "## [N]" headings in failed-test-predecessors.md.
                        Each entry is one failed/timed-out attempt (incl. retries).
  --project <name>      Playwright project (default: default)
  --repeat-sanity <n>   Victim-alone runs before bisect (default: 1)
  --candidates          Entries as file::title (title required for -g selection)
`);
  process.exit(code);
}

function parseArgs(argv) {
  const args = {
    fromTimeline: null,
    victimIndex: 0,
    victim: null,
    grep: null,
    candidates: [],
    project: 'default',
    repeatSanity: 1
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') usage(0);
    else if (a === '--from-timeline') args.fromTimeline = argv[++i];
    else if (a === '--victim-index') args.victimIndex = Number(argv[++i]);
    else if (a === '--victim') args.victim = argv[++i];
    else if (a === '--grep' || a === '-g') args.grep = argv[++i];
    else if (a === '--project') args.project = argv[++i];
    else if (a === '--repeat-sanity') args.repeatSanity = Number(argv[++i]);
    else if (a === '--candidates') {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        args.candidates.push(parseCandidate(argv[++i]));
      }
    } else {
      console.error(`Unknown arg: ${a}`);
      usage(1);
    }
  }
  return args;
}

function parseCandidate(raw) {
  const sep = raw.indexOf('::');
  if (sep === -1) {
    throw new Error(`Candidate must be file::title, got: ${raw}`);
  }
  return { file: raw.slice(0, sep), title: raw.slice(sep + 2) };
}

function loadFromTimeline(timelinePath, victimIndex) {
  const data = JSON.parse(fs.readFileSync(timelinePath, 'utf8'));
  const failures = data.failures || [];
  if (!failures.length) throw new Error(`No failures in ${timelinePath}`);
  if (victimIndex < 0 || victimIndex >= failures.length) {
    throw new Error(`--victim-index ${victimIndex} out of range (0..${failures.length - 1})`);
  }

  const failure = failures[victimIndex];
  const victim = failure.victim;
  return {
    victimFile: victim.file,
    victimTitle: victim.title,
    project: victim.project || 'default',
    candidates: failure.predecessors
      .filter((p) => !p.isVictim)
      .map((p) => ({ file: p.file, title: p.title }))
  };
}

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function runPlaywright({ files, grep, project }) {
  const uniqueFiles = [...new Set(files)];
  const args = ['playwright', 'test', ...uniqueFiles, '--project', project, '--workers=1', '--retries=0'];
  if (grep) args.push('-g', grep);

  console.log(`\n> npx ${args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}`);
  const result = spawnSync('npx', args, {
    cwd: path.join(__dirname, '..'),
    stdio: 'inherit',
    env: process.env,
    shell: process.platform === 'win32'
  });
  return result.status === 0;
}

function runVictim(file, title, project) {
  return runPlaywright({ files: [file], grep: title, project });
}

/** One workers=1 process: candidates then victim, selected via title alternation. */
function runSequence(candidates, victimFile, victimTitle, project) {
  const files = [...candidates.map((c) => c.file), victimFile];
  const grep = [...candidates.map((c) => c.title), victimTitle].map(escapeRegex).join('|');
  return runPlaywright({ files, grep, project });
}

function main() {
  const args = parseArgs(process.argv.slice(2));

  let victimFile;
  let victimTitle;
  let project = args.project;
  let candidates;

  if (args.fromTimeline) {
    ({ victimFile, victimTitle, project, candidates } = loadFromTimeline(args.fromTimeline, args.victimIndex));
  } else if (args.victim && args.grep) {
    victimFile = args.victim;
    victimTitle = args.grep;
    candidates = args.candidates;
  } else {
    usage(1);
  }

  console.log(`Victim: ${victimFile} › ${victimTitle}`);
  console.log(`Project: ${project}`);
  console.log(`Candidates: ${candidates.length}`);

  for (let i = 0; i < args.repeatSanity; i++) {
    console.log(`\n=== Sanity ${i + 1}/${args.repeatSanity}: victim alone ===`);
    if (!runVictim(victimFile, victimTitle, project)) {
      console.error('Victim fails alone — not contamination (or env not ready).');
      process.exit(2);
    }
  }

  if (candidates.length === 0) {
    console.log('No predecessors/candidates to bisect.');
    process.exit(0);
  }

  console.log('\n=== Reproduce: all candidates then victim ===');
  if (runSequence(candidates, victimFile, victimTitle, project)) {
    console.log('Victim still passes after all candidates — no contaminator in this set.');
    process.exit(0);
  }

  let lo = 0;
  let hi = candidates.length;
  while (lo + 1 < hi) {
    const mid = Math.floor((lo + hi) / 2);
    console.log(`\n=== Bisect: first ${mid}/${candidates.length} candidates + victim ===`);
    if (runSequence(candidates.slice(0, mid), victimFile, victimTitle, project)) {
      lo = mid;
    } else {
      hi = mid;
    }
  }

  const contaminator = candidates[hi - 1];
  if (!contaminator) {
    console.error('Bisect did not isolate a contaminator.');
    process.exit(3);
  }

  console.log('\n=== Confirm: contaminator then victim ===');
  const confirmsFail = !runSequence([contaminator], victimFile, victimTitle, project);
  console.log('\n=== Confirm: victim alone again ===');
  const alonePasses = runVictim(victimFile, victimTitle, project);

  console.log('\n========== RESULT ==========');
  console.log(`Contaminator: ${contaminator.file} › ${contaminator.title}`);
  console.log(`Victim:       ${victimFile} › ${victimTitle}`);
  console.log(`Confirm contaminator→victim fails: ${confirmsFail}`);
  console.log(`Confirm victim alone passes:       ${alonePasses}`);
  console.log(
    `\nnpx playwright test ${contaminator.file} ${victimFile} ` +
    `-g '${escapeRegex(contaminator.title)}|${escapeRegex(victimTitle)}' ` +
    `--project=${project} --workers=1`
  );

  process.exit(confirmsFail && alonePasses ? 0 : 4);
}

try {
  main();
} catch (err) {
  console.error(err.message || err);
  process.exit(1);
}
