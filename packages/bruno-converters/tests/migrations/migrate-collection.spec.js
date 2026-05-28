const path = require('path');
const fs = require('fs');
const os = require('os');
const { migrateCollection, extractScriptBlocks, formatCollectionReport } = require('../../src/migrations/migrate-collection');

describe('extractScriptBlocks', () => {
  it('should extract pre-request script block', () => {
    const content = `meta {
  name: test
}

script:pre-request {
  bru.getEnvVar("key");
}
`;
    const blocks = extractScriptBlocks(content);
    expect(blocks.preRequest).not.toBeNull();
    expect(blocks.preRequest.code).toContain('bru.getEnvVar');
    expect(blocks.postResponse).toBeNull();
  });

  it('should extract post-response script block', () => {
    const content = `script:post-response {
  const val = bru.getEnvVar("key");
  bru.setEnvVar("key2", val);
}
`;
    const blocks = extractScriptBlocks(content);
    expect(blocks.postResponse).not.toBeNull();
    expect(blocks.postResponse.code).toContain('bru.getEnvVar');
    expect(blocks.postResponse.code).toContain('bru.setEnvVar');
  });

  it('should extract both script blocks', () => {
    const content = `script:pre-request {
  bru.getEnvVar("a");
}

script:post-response {
  bru.setEnvVar("b", "c");
}
`;
    const blocks = extractScriptBlocks(content);
    expect(blocks.preRequest).not.toBeNull();
    expect(blocks.postResponse).not.toBeNull();
  });

  it('should handle nested braces in scripts', () => {
    const content = `script:pre-request {
  if (true) {
    bru.getEnvVar("key");
  }
}
`;
    const blocks = extractScriptBlocks(content);
    expect(blocks.preRequest).not.toBeNull();
    expect(blocks.preRequest.code).toContain('if (true)');
    expect(blocks.preRequest.code).toContain('bru.getEnvVar');
  });

  it('should return nulls for content without scripts', () => {
    const content = `meta {
  name: test
}

get {
  url: https://example.com
}
`;
    const blocks = extractScriptBlocks(content);
    expect(blocks.preRequest).toBeNull();
    expect(blocks.postResponse).toBeNull();
  });
});

describe('migrateCollection', () => {
  let tmpDir;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'bruno-migration-test-'));
  });

  afterEach(() => {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('should migrate scripts in .bru files', () => {
    const bruContent = `meta {
  name: test-request
}

script:pre-request {
  const token = bru.getEnvVar("auth_token");
  bru.setEnvVar("cached", token);
}
`;
    fs.writeFileSync(path.join(tmpDir, 'test.bru'), bruContent);

    const results = migrateCollection(tmpDir, '1', '2');
    expect(results.summary.filesChanged).toBe(1);
    expect(results.summary.totalChanges).toBe(2);

    const migrated = fs.readFileSync(path.join(tmpDir, 'test.bru'), 'utf-8');
    expect(migrated).toContain('bru.env.get');
    expect(migrated).toContain('bru.env.set');
    expect(migrated).not.toContain('bru.getEnvVar');
    expect(migrated).not.toContain('bru.setEnvVar');
  });

  it('should support dry run mode', () => {
    const bruContent = `script:pre-request {
  bru.getEnvVar("key");
}
`;
    fs.writeFileSync(path.join(tmpDir, 'test.bru'), bruContent);

    const results = migrateCollection(tmpDir, '1', '2', { dryRun: true });
    expect(results.summary.filesChanged).toBe(1);

    // File should NOT be modified in dry run
    const content = fs.readFileSync(path.join(tmpDir, 'test.bru'), 'utf-8');
    expect(content).toContain('bru.getEnvVar');
  });

  it('should skip files without deprecated APIs', () => {
    const bruContent = `script:pre-request {
  bru.setVar("key", "value");
}
`;
    fs.writeFileSync(path.join(tmpDir, 'clean.bru'), bruContent);

    const results = migrateCollection(tmpDir, '1', '2');
    expect(results.summary.filesChanged).toBe(0);
    expect(results.files).toHaveLength(0);
  });

  it('should handle nested directories', () => {
    const subDir = path.join(tmpDir, 'sub', 'folder');
    fs.mkdirSync(subDir, { recursive: true });
    fs.writeFileSync(path.join(subDir, 'nested.bru'), `script:pre-request {
  bru.getEnvVar("key");
}
`);

    const results = migrateCollection(tmpDir, '1', '2');
    expect(results.summary.filesChanged).toBe(1);
  });
});

describe('formatCollectionReport', () => {
  it('should show relative paths and summary', () => {
    const results = {
      collectionDir: '/projects/my-api',
      summary: { totalFiles: 5, filesChanged: 2, totalChanges: 3 },
      files: [
        {
          path: '/projects/my-api/requests/auth.bru',
          changes: [
            { line: 2, oldApi: 'bru.getEnvVar', newApi: 'bru.env.get', block: 'preRequest' }
          ]
        }
      ]
    };
    const report = formatCollectionReport(results);
    expect(report).toContain('5 file(s)');
    expect(report).toContain('3 deprecated call(s)');
    expect(report).toContain('requests/auth.bru');
    expect(report).not.toContain('/projects/my-api/requests');
    expect(report).toContain('pre-request:2');
    expect(report).toContain('bru.getEnvVar -> bru.env.get');
  });

  it('should format block labels as pre-request / post-response', () => {
    const results = {
      collectionDir: '/col',
      summary: { totalFiles: 1, filesChanged: 1, totalChanges: 2 },
      files: [
        {
          path: '/col/test.bru',
          changes: [
            { line: 3, oldApi: 'bru.getEnvVar', newApi: 'bru.env.get', block: 'preRequest' },
            { line: 5, oldApi: 'bru.setEnvVar', newApi: 'bru.env.set', block: 'postResponse' }
          ]
        }
      ]
    };
    const report = formatCollectionReport(results);
    expect(report).toContain('pre-request:3');
    expect(report).toContain('post-response:5');
  });

  it('should format errors', () => {
    const results = {
      collectionDir: '/col',
      summary: { totalFiles: 1, filesChanged: 0, totalChanges: 0 },
      files: [
        { path: '/col/bad.bru', changes: [], error: 'Parse error' }
      ]
    };
    const report = formatCollectionReport(results);
    expect(report).toContain('[error] bad.bru');
    expect(report).toContain('Parse error');
  });
});
