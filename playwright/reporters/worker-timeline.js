const fs = require('fs');
const path = require('path');

/**
 * Records which tests ran on each Playwright worker so CI failures can be
 * walked backwards to likely contaminators (shared electronApp / page state).
 *
 * Writes into playwright-report/ (already uploaded by CI):
 *   - worker-timeline.json
 *   - failed-test-predecessors.json
 *   - failed-test-predecessors.md
 */
class WorkerTimelineReporter {
  constructor() {
    this.events = [];
    this.outputDir = path.join(process.cwd(), 'playwright-report');
  }

  onTestEnd(test, result) {
    this.events.push({
      workerIndex: result.workerIndex,
      parallelIndex: result.parallelIndex,
      file: path.relative(process.cwd(), test.location.file).replace(/\\/g, '/'),
      line: test.location.line,
      title: test.title,
      titlePath: test.titlePath().filter(Boolean).join(' › '),
      project: projectName(test),
      status: result.status,
      retry: result.retry,
      duration: result.duration,
      startTime: result.startTime instanceof Date
        ? result.startTime.toISOString()
        : String(result.startTime),
      error: result.error?.message
        ? String(result.error.message).split('\n')[0].slice(0, 240)
        : undefined
    });
  }

  onEnd() {
    fs.mkdirSync(this.outputDir, { recursive: true });

    const byWorker = {};
    for (const event of this.events) {
      const key = String(event.workerIndex);
      if (!byWorker[key]) byWorker[key] = [];
      byWorker[key].push(event);
    }

    for (const key of Object.keys(byWorker)) {
      byWorker[key].sort((a, b) => {
        const t = String(a.startTime).localeCompare(String(b.startTime));
        if (t !== 0) return t;
        return a.retry - b.retry;
      });
    }

    const timelinePath = path.join(this.outputDir, 'worker-timeline.json');
    fs.writeFileSync(timelinePath, JSON.stringify({ workers: byWorker }, null, 2));

    const failures = [];
    for (const [workerKey, events] of Object.entries(byWorker)) {
      for (let i = 0; i < events.length; i++) {
        const event = events[i];
        if (event.status !== 'failed' && event.status !== 'timedOut') continue;

        const predecessors = events.slice(0, i + 1).map((e, idx) => ({
          index: idx,
          file: e.file,
          line: e.line,
          title: e.title,
          titlePath: e.titlePath,
          status: e.status,
          retry: e.retry,
          project: e.project,
          isVictim: idx === i
        }));

        failures.push({
          workerIndex: Number(workerKey),
          victim: {
            file: event.file,
            line: event.line,
            title: event.title,
            titlePath: event.titlePath,
            project: event.project,
            status: event.status,
            retry: event.retry,
            error: event.error
          },
          predecessors
        });
      }
    }

    const predecessorsJsonPath = path.join(this.outputDir, 'failed-test-predecessors.json');
    fs.writeFileSync(predecessorsJsonPath, JSON.stringify({ failures }, null, 2));

    const md = renderPredecessorsMarkdown(failures);
    fs.writeFileSync(path.join(this.outputDir, 'failed-test-predecessors.md'), md);

    if (failures.length > 0) {
      console.log(`\n[worker-timeline] ${failures.length} failed attempt(s) → ${predecessorsJsonPath}`);
    } else {
      console.log(`\n[worker-timeline] no failures; timeline → ${timelinePath}`);
    }
  }
}

function projectName(test) {
  let suite = test.parent;
  while (suite) {
    const project = typeof suite.project === 'function' ? suite.project() : undefined;
    if (project?.name) return project.name;
    suite = suite.parent;
  }
  return 'default';
}

function shellQuote(value) {
  if (/^[A-Za-z0-9_./:@-]+$/.test(value)) return value;
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

function renderPredecessorsMarkdown(failures) {
  if (failures.length === 0) {
    return '# Failed test predecessors\n\nNo failed or timed-out attempts in this run.\n';
  }

  let md = '# Failed test predecessors\n\n';
  md += 'For each failure, tests listed above the victim ran earlier on the **same Playwright worker** ';
  md += '(shared `electronApp` / `page` state). Use these as contaminator suspects.\n\n';
  md += 'The `[N]` in each heading is the `--victim-index N` for ';
  md += '`scripts/find-e2e-contaminator.js --from-timeline …` (each entry is one failed/timed-out attempt, including retries).\n\n';
  md += '**Note:** same Playwright `workerIndex` ≠ shared Electron profile. Tests using ';
  md += '`pageWithUserData` / `newPage` launch separate apps; only default `page` tests share ';
  md += '`electronApp`. Being listed as a predecessor is a suspect, not a confirmed contaminator.\n\n';
  md += 'To bisect the failures with the most predecessors automatically:\n\n';
  md += '```bash\n';
  md += 'node scripts/find-e2e-contaminator.js --from-timeline playwright-report/failed-test-predecessors.json --auto-debug\n';
  md += '```\n\n';

  failures.forEach((failure, failureIndex) => {
    const { victim, predecessors, workerIndex } = failure;
    md += `## [${failureIndex}] ${victim.status.toUpperCase()} ${victim.titlePath}\n\n`;
    md += `- **file:** \`${victim.file}\`\n`;
    md += `- **worker:** ${workerIndex}\n`;
    md += `- **retry:** ${victim.retry}\n`;
    md += `- **project:** ${victim.project}\n`;
    if (victim.error) {
      md += `- **error:** ${victim.error}\n`;
    }
    md += `\n### Predecessors on worker ${workerIndex}\n\n`;
    predecessors.forEach((p) => {
      const marker = p.isVictim ? ' ← failed here' : '';
      md += `${p.index + 1}. \`${p.file}\` › ${p.titlePath} _(status=${p.status}, retry=${p.retry})_${marker}\n`;
    });

    const prior = predecessors.filter((p) => !p.isVictim);
    md += `\n### Debug\n\n`;
    md += '```bash\n';
    md += `# victim alone\n`;
    md += `npx playwright test ${shellQuote(victim.file + (victim.line ? ':' + victim.line : ''))} --project=${shellQuote(victim.project)} --workers=1\n\n`;
    md += `# bisect predecessors from this artifact\n`;
    md += `node scripts/find-e2e-contaminator.js --from-timeline playwright-report/failed-test-predecessors.json --victim-index ${failureIndex}\n`;
    if (prior.length > 0) {
      md += `\n# or manually with candidate file:line entries\n`;
      const candidateArgs = prior
        .map((p) => shellQuote(p.line ? `${p.file}:${p.line}` : `${p.file}::${p.title}`))
        .join(' ');
      md += `node scripts/find-e2e-contaminator.js --victim ${shellQuote(victim.file + (victim.line ? ':' + victim.line : ''))} --project ${shellQuote(victim.project)} --candidates ${candidateArgs}\n`;
    }
    md += '```\n\n';
  });

  return md;
}

module.exports = WorkerTimelineReporter;
