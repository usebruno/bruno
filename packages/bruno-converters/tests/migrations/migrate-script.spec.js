const { migrateScript, detectDeprecatedUsage, formatMigrationReport } = require('../../src/migrations/migrate-script');

describe('migrateScript', () => {
  describe('simple renames (v1 -> v2)', () => {
    it('should migrate bru.getEnvVar() to bru.env.get()', () => {
      const input = 'const val = bru.getEnvVar("key");';
      const { code, changes } = migrateScript(input, '1', '2');
      expect(code).toContain('bru.env.get');
      expect(code).not.toContain('bru.getEnvVar');
      expect(changes).toHaveLength(1);
      expect(changes[0].oldApi).toBe('bru.getEnvVar');
      expect(changes[0].newApi).toBe('bru.env.get');
    });

    it('should migrate bru.setEnvVar() to bru.env.set()', () => {
      const input = 'bru.setEnvVar("key", "value");';
      const { code, changes } = migrateScript(input, '1', '2');
      expect(code).toContain('bru.env.set');
      expect(code).not.toContain('bru.setEnvVar');
      expect(changes).toHaveLength(1);
    });

    it('should migrate bru.hasEnvVar() to bru.env.has()', () => {
      const input = 'if (bru.hasEnvVar("key")) {}';
      const { code } = migrateScript(input, '1', '2');
      expect(code).toContain('bru.env.has');
    });

    it('should migrate bru.deleteEnvVar() to bru.env.delete()', () => {
      const input = 'bru.deleteEnvVar("key");';
      const { code } = migrateScript(input, '1', '2');
      expect(code).toContain('bru.env.delete');
    });

    it('should migrate bru.getAllEnvVars() to bru.env.getAll()', () => {
      const input = 'const vars = bru.getAllEnvVars();';
      const { code } = migrateScript(input, '1', '2');
      expect(code).toContain('bru.env.getAll');
    });

    it('should migrate bru.deleteAllEnvVars() to bru.env.deleteAll()', () => {
      const input = 'bru.deleteAllEnvVars();';
      const { code } = migrateScript(input, '1', '2');
      expect(code).toContain('bru.env.deleteAll');
    });

    it('should migrate bru.getEnvName() to bru.env.getName()', () => {
      const input = 'const name = bru.getEnvName();';
      const { code } = migrateScript(input, '1', '2');
      expect(code).toContain('bru.env.getName');
    });
  });

  describe('multiple occurrences', () => {
    it('should migrate all deprecated calls in a single script', () => {
      const input = [
        'const val = bru.getEnvVar("key");',
        'bru.setEnvVar("key2", val);',
        'const all = bru.getAllEnvVars();'
      ].join('\n');

      const { code, changes } = migrateScript(input, '1', '2');
      expect(code).toContain('bru.env.get');
      expect(code).toContain('bru.env.set');
      expect(code).toContain('bru.env.getAll');
      expect(code).not.toContain('bru.getEnvVar');
      expect(code).not.toContain('bru.setEnvVar');
      expect(code).not.toContain('bru.getAllEnvVars');
      expect(changes).toHaveLength(3);
    });
  });

  describe('mixed deprecated and current API', () => {
    it('should only migrate deprecated calls, leave others untouched', () => {
      const input = [
        'const val = bru.getEnvVar("key");',
        'bru.setVar("runtime", val);',
        'const name = bru.getCollectionName();'
      ].join('\n');

      const { code, changes } = migrateScript(input, '1', '2');
      expect(code).toContain('bru.env.get');
      expect(code).toContain('bru.setVar');
      expect(code).toContain('bru.getCollectionName');
      expect(changes).toHaveLength(1);
    });
  });

  describe('no-op cases', () => {
    it('should return unchanged code if already migrated', () => {
      const input = 'const val = bru.env.get("key");';
      const { code, changes } = migrateScript(input, '1', '2');
      expect(code).toBe(input);
      expect(changes).toHaveLength(0);
    });

    it('should handle empty script', () => {
      const { code, changes } = migrateScript('', '1', '2');
      expect(code).toBe('');
      expect(changes).toHaveLength(0);
    });

    it('should handle whitespace-only script', () => {
      const { code, changes } = migrateScript('   \n  ', '1', '2');
      expect(code).toBe('   \n  ');
      expect(changes).toHaveLength(0);
    });

    it('should return unchanged code for same version', () => {
      const input = 'bru.getEnvVar("key");';
      const { code, changes } = migrateScript(input, '2', '2');
      expect(code).toBe(input);
      expect(changes).toHaveLength(0);
    });

    it('should return unchanged code for backward version', () => {
      const input = 'bru.getEnvVar("key");';
      const { code, changes } = migrateScript(input, '2', '1');
      expect(code).toBe(input);
      expect(changes).toHaveLength(0);
    });
  });

  describe('complex scripts', () => {
    it('should handle deprecated API in conditional expression', () => {
      const input = 'const val = bru.hasEnvVar("key") ? bru.getEnvVar("key") : "default";';
      const { code, changes } = migrateScript(input, '1', '2');
      expect(code).toContain('bru.env.has');
      expect(code).toContain('bru.env.get');
      expect(changes).toHaveLength(2);
    });

    it('should handle deprecated API in callback', () => {
      const input = 'test("check env", () => { expect(bru.getEnvVar("key")).to.equal("val"); });';
      const { code } = migrateScript(input, '1', '2');
      expect(code).toContain('bru.env.get');
    });

    it('should handle deprecated API with template literal argument', () => {
      const input = 'bru.getEnvVar(`key_${suffix}`);';
      const { code } = migrateScript(input, '1', '2');
      expect(code).toContain('bru.env.get');
    });
  });

  describe('change tracking', () => {
    it('should include documentation in changes', () => {
      const input = 'bru.getEnvVar("key");';
      const { changes } = migrateScript(input, '1', '2');
      expect(changes[0].doc).toBeTruthy();
      expect(changes[0].doc.reason).toContain('namespace');
      expect(changes[0].doc.migration).toContain('bru.env.get');
    });

    it('should report line numbers', () => {
      const input = 'const x = 1;\nbru.getEnvVar("key");';
      const { changes } = migrateScript(input, '1', '2');
      expect(changes[0].line).toBe(2);
    });
  });
});

describe('detectDeprecatedUsage', () => {
  it('should detect deprecated calls without modifying code', () => {
    const input = 'bru.getEnvVar("key");\nbru.setEnvVar("k", "v");';
    const findings = detectDeprecatedUsage(input, '1', '2');
    expect(findings).toHaveLength(2);
    expect(findings[0].oldApi).toBe('bru.getEnvVar');
    expect(findings[1].oldApi).toBe('bru.setEnvVar');
  });

  it('should return empty array for clean code', () => {
    const input = 'bru.env.get("key");';
    const findings = detectDeprecatedUsage(input, '1', '2');
    expect(findings).toHaveLength(0);
  });
});

describe('formatMigrationReport', () => {
  it('should format empty changes', () => {
    const report = formatMigrationReport([]);
    expect(report).toContain('No deprecated APIs found');
  });

  it('should format changes with line numbers and docs', () => {
    const changes = [
      {
        line: 5,
        oldApi: 'bru.getEnvVar',
        newApi: 'bru.env.get',
        doc: { reason: 'namespace change', migration: 'Use bru.env.get()' }
      }
    ];
    const report = formatMigrationReport(changes);
    expect(report).toContain('1 deprecated API usage');
    expect(report).toContain('Line 5');
    expect(report).toContain('bru.getEnvVar -> bru.env.get');
    expect(report).toContain('namespace change');
  });
});
