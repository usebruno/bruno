const { getApplicableMigrations, getCurrentVersion, getAllMigrations } = require('../../src/migrations/registry');

describe('Migration Registry', () => {
  describe('getApplicableMigrations', () => {
    it('should return migrations for v1 -> v2', () => {
      const migrations = getApplicableMigrations('1', '2');
      expect(migrations.length).toBeGreaterThan(0);
      expect(migrations[0].id).toBe('env-namespace-v2');
    });

    it('should return empty for same version', () => {
      expect(getApplicableMigrations('1', '1')).toHaveLength(0);
    });

    it('should return empty for backward version', () => {
      expect(getApplicableMigrations('2', '1')).toHaveLength(0);
    });

    it('should return empty for invalid versions', () => {
      expect(getApplicableMigrations('abc', '2')).toHaveLength(0);
    });
  });

  describe('getCurrentVersion', () => {
    it('should return the latest version', () => {
      const version = getCurrentVersion();
      expect(parseInt(version, 10)).toBeGreaterThanOrEqual(2);
    });
  });

  describe('getAllMigrations', () => {
    it('should return all migration entries', () => {
      const migrations = getAllMigrations();
      expect(migrations.length).toBeGreaterThan(0);
    });

    it('should have required fields in each entry', () => {
      const migrations = getAllMigrations();
      for (const m of migrations) {
        expect(m).toHaveProperty('id');
        expect(m).toHaveProperty('fromVersion');
        expect(m).toHaveProperty('toVersion');
        expect(m).toHaveProperty('simpleTranslations');
        expect(m).toHaveProperty('complexTransformations');
        expect(m).toHaveProperty('docs');
      }
    });

    it('should have docs for every simple translation', () => {
      const migrations = getAllMigrations();
      for (const m of migrations) {
        for (const oldApi of Object.keys(m.simpleTranslations)) {
          expect(oldApi in m.docs).toBe(true);
          expect(m.docs[oldApi]).toHaveProperty('reason');
          expect(m.docs[oldApi]).toHaveProperty('migration');
        }
      }
    });
  });
});
