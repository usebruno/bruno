jest.mock('platform', () => ({
  os: {
    family: 'Windows'
  }
}));

import { findApiSpecByPathname, getApiSpecTabUid, isApiSpecTabForPathname } from './index';

const SCRATCH_UID = 'scratch-a';

describe('API spec identity on Windows, where file paths ignore case', () => {
  it('treats two spellings of one file as the same spec, so it cannot open twice', () => {
    expect(getApiSpecTabUid(SCRATCH_UID, 'C:\\Workspace\\Petstore.yaml'))
      .toBe(getApiSpecTabUid(SCRATCH_UID, 'c:/workspace/petstore.yaml'));
  });

  it('still tells two different specs apart', () => {
    expect(getApiSpecTabUid(SCRATCH_UID, 'C:/workspace/petstore.yaml'))
      .not.toBe(getApiSpecTabUid(SCRATCH_UID, 'C:/workspace/orders.yaml'));
  });

  it('finds the loaded spec even when the path is spelled with different capitals', () => {
    const apiSpecs = [{ uid: 'runtime-uid', pathname: 'C:\\Workspace\\Petstore.yaml' }];

    expect(findApiSpecByPathname(apiSpecs, 'c:/workspace/petstore.yaml').uid).toBe('runtime-uid');
  });

  it('matches an open tab to its spec when the path is spelled with different capitals', () => {
    const tab = { type: 'api-spec', apiSpecPathname: 'C:\\Workspace\\Petstore.yaml' };

    expect(isApiSpecTabForPathname(tab, 'c:/workspace/petstore.yaml')).toBe(true);
  });
});
