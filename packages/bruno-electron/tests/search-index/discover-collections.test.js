const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const readline = require('node:readline');
const { getRipgrepPath } = require('../../src/services/search-index/ripgrep-path');
const {
  ownerForAbsolutePath,
  relativePathAllowed,
  pathStringMatchesTerm,
  normalizeRoots,
  buildContentArgs
} = require('../../src/services/search-index/discover-collections');

describe('discover-collections', () => {
  const roots = normalizeRoots([
    { path: '/ws/Alpha', name: 'Alpha' },
    { path: '/ws/Alpha-edge', name: 'Alpha-edge' }
  ]);

  it('maps nested paths to the longest matching collection root', () => {
    const hit = path.join('/ws/Alpha-edge', 'requests', 'ping.bru');
    const owner = ownerForAbsolutePath(hit, roots);
    expect(owner.root).toBe(path.resolve('/ws/Alpha-edge'));
  });

  it('matches request paths by substring', () => {
    expect(pathStringMatchesTerm('api/users-edge.bru', 'edge')).toBe(true);
  });

  it('rejects denied relative paths', () => {
    const owner = roots[0];
    expect(relativePathAllowed(owner, 'node_modules/pkg/index.bru')).toBe(false);
    expect(relativePathAllowed(owner, 'ping.bru')).toBe(true);
  });

  it('finds request content with the packaged ripgrep binary', async () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-rg-discover-'));
    const collectionRoot = path.join(tmp, 'CandidateCol');
    fs.mkdirSync(path.join(collectionRoot, 'requests'), { recursive: true });
    fs.writeFileSync(path.join(collectionRoot, 'bruno.json'), JSON.stringify({ name: 'CandidateCol', version: '1' }));
    fs.writeFileSync(
      path.join(collectionRoot, 'requests', 'ping.bru'),
      'meta {\n  name: ping\n  type: http\n  seq: 1\n}\n\nget {\n  url: https://example.com/unique-rg-token-42\n}\n'
    );

    const roots = normalizeRoots([{ path: collectionRoot, name: 'CandidateCol' }]);
    const args = buildContentArgs(getRipgrepPath(), 'unique-rg-token-42', roots);
    const hits = await new Promise((resolve, reject) => {
      const child = spawn(args[0], args.slice(1), { stdio: ['ignore', 'pipe', 'pipe'] });
      const lines = [];
      const rl = readline.createInterface({ input: child.stdout });
      rl.on('line', (line) => lines.push(line.trim()));
      child.on('close', (code) => {
        rl.close();
        if (code === 0 || code === 1) resolve(lines);
        else reject(new Error(`ripgrep failed with ${code}`));
      });
    });

    expect(hits.some((hit) => hit.startsWith(collectionRoot))).toBe(true);
  });
});
