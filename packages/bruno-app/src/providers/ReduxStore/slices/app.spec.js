import appReducer, { updateSidebarSectionSizes } from './app';

const baseState = () => appReducer(undefined, { type: '@@INIT' });

describe('app slice — sidebarSectionSizes', () => {
  it('starts empty', () => {
    expect(baseState().sidebarSectionSizes).toEqual({});
  });

  it('merges id→weight pairs without dropping existing keys', () => {
    let state = appReducer(baseState(), updateSidebarSectionSizes({ collections: 4 }));
    state = appReducer(state, updateSidebarSectionSizes({ 'api-specs': 1 }));
    expect(state.sidebarSectionSizes).toEqual({ 'collections': 4, 'api-specs': 1 });
  });

  it('ignores non-finite or non-positive weights', () => {
    const state = appReducer(
      baseState(),
      updateSidebarSectionSizes({ a: 0, b: -2, c: NaN, d: Infinity, e: 3 })
    );
    expect(state.sidebarSectionSizes).toEqual({ e: 3 });
  });
});
