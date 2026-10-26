jest.mock('platform', () => ({
  os: {
    family: 'Windows'
  }
}));

import {
  buildSpecSelectOptions,
  findApiSpecByPathname,
  getApiSpecTabUid,
  isApiSpecTabForPathname,
  resolveSpecPath
} from './index';

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

  it('preselects the listed spec, with no duplicate option, when the stored path differs only in case', () => {
    const specs = [{ uid: 'orders', name: 'Orders', pathname: 'C:\\ws\\specs\\orders.yaml' }];

    expect(buildSpecSelectOptions(specs, 'C:/WS/Specs/Orders.yaml')).toEqual([
      { uid: 'orders', name: 'Orders', pathname: 'C:\\ws\\specs\\orders.yaml' }
    ]);
  });

  it('resolves the stored path when the picked option differs from it only in case', () => {
    expect(resolveSpecPath('C:/WS/Specs/Orders.yaml', [], 'c:\\ws\\specs\\orders.yaml')).toBe('c:\\ws\\specs\\orders.yaml');
  });
});
