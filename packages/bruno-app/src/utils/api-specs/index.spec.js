import {
  findApiSpecByPathname,
  getApiSpecTabUid,
  hasUnsavedApiSpecChanges,
  isApiSpecTab,
  isApiSpecTabForPathname
} from './index';

const SCRATCH_A = 'scratch-a';
const SCRATCH_B = 'scratch-b';

describe('API spec tab identity', () => {
  describe('getApiSpecTabUid', () => {
    it('gives the same tab id to the same spec every time, so reopening a spec finds its tab', () => {
      expect(getApiSpecTabUid(SCRATCH_A, '/workspace/petstore.yaml'))
        .toBe(getApiSpecTabUid(SCRATCH_A, '/workspace/petstore.yaml'));
    });

    it('gives different specs different tab ids', () => {
      expect(getApiSpecTabUid(SCRATCH_A, '/workspace/petstore.yaml'))
        .not.toBe(getApiSpecTabUid(SCRATCH_A, '/workspace/orders.yaml'));
    });

    it('gives one spec a separate tab id in each workspace that holds it', () => {
      expect(getApiSpecTabUid(SCRATCH_A, '/workspace/petstore.yaml'))
        .not.toBe(getApiSpecTabUid(SCRATCH_B, '/workspace/petstore.yaml'));
    });

    it('treats a windows path and a posix path to the same file as one spec', () => {
      expect(getApiSpecTabUid(SCRATCH_A, 'C:\\workspace\\petstore.yaml'))
        .toBe(getApiSpecTabUid(SCRATCH_A, 'C:/workspace/petstore.yaml'));
    });

    it('hands back nothing when there is no path to identify the spec by', () => {
      expect(getApiSpecTabUid(SCRATCH_A, '')).toBeNull();
      expect(getApiSpecTabUid(SCRATCH_A, undefined)).toBeNull();
    });

    it('hands back nothing when there is no workspace to hold the tab', () => {
      expect(getApiSpecTabUid(null, '/workspace/petstore.yaml')).toBeNull();
    });
  });

  describe('findApiSpecByPathname', () => {
    const apiSpecs = [
      { uid: 'runtime-uid-1', pathname: '/workspace/petstore.yaml' },
      { uid: 'runtime-uid-2', pathname: 'C:\\workspace\\orders.yaml' }
    ];

    it('finds the loaded spec for a path, which is how a restored tab finds its spec again', () => {
      expect(findApiSpecByPathname(apiSpecs, '/workspace/petstore.yaml').uid).toBe('runtime-uid-1');
    });

    it('finds a spec whose stored path uses the other separator', () => {
      expect(findApiSpecByPathname(apiSpecs, 'C:/workspace/orders.yaml').uid).toBe('runtime-uid-2');
    });

    it('finds nothing when the spec is not loaded yet', () => {
      expect(findApiSpecByPathname(apiSpecs, '/workspace/missing.yaml')).toBeNull();
      expect(findApiSpecByPathname(undefined, '/workspace/petstore.yaml')).toBeNull();
      expect(findApiSpecByPathname(apiSpecs, '')).toBeNull();
    });
  });

  describe('isApiSpecTab and isApiSpecTabForPathname', () => {
    const tab = { type: 'api-spec', apiSpecPathname: '/workspace/petstore.yaml' };

    it('recognises a spec tab', () => {
      expect(isApiSpecTab(tab)).toBe(true);
      expect(isApiSpecTab({ type: 'http-request' })).toBe(false);
      expect(isApiSpecTab(undefined)).toBe(false);
    });

    it('matches a spec tab to its own spec and to no other', () => {
      expect(isApiSpecTabForPathname(tab, '/workspace/petstore.yaml')).toBe(true);
      expect(isApiSpecTabForPathname(tab, '/workspace/orders.yaml')).toBe(false);
    });

    it('does not match the collection spec tab, which is a different kind of tab', () => {
      const collectionSpecTab = { type: 'openapi-spec', apiSpecPathname: '/workspace/petstore.yaml' };
      expect(isApiSpecTabForPathname(collectionSpecTab, '/workspace/petstore.yaml')).toBe(false);
    });

    it('matches across path separators so windows does not open a second tab for one spec', () => {
      const windowsTab = { type: 'api-spec', apiSpecPathname: 'C:\\workspace\\petstore.yaml' };
      expect(isApiSpecTabForPathname(windowsTab, 'C:/workspace/petstore.yaml')).toBe(true);
    });
  });

  describe('hasUnsavedApiSpecChanges', () => {
    it('reports unsaved work when the editor content differs from the file on disk', () => {
      expect(hasUnsavedApiSpecChanges({ raw: 'openapi: 3.0.0', draft: 'openapi: 3.1.0' })).toBe(true);
    });

    it('reports nothing unsaved when the editor content matches the file on disk', () => {
      expect(hasUnsavedApiSpecChanges({ raw: 'openapi: 3.0.0', draft: 'openapi: 3.0.0' })).toBe(false);
    });

    it('reports nothing unsaved when the spec has not been edited', () => {
      expect(hasUnsavedApiSpecChanges({ raw: 'openapi: 3.0.0' })).toBe(false);
    });

    it('reports nothing unsaved for a spec that is not loaded, so a loading tab cannot lose work', () => {
      expect(hasUnsavedApiSpecChanges(null)).toBe(false);
      expect(hasUnsavedApiSpecChanges(undefined)).toBe(false);
    });
  });
});
