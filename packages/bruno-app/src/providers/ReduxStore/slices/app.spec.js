import appReducer, {
  updateSidebarSectionSizes,
  removeSidebarSectionSize,
  setSidebarSectionExpanded,
  setSidebarExpandedSections
} from './app';

const baseState = () => appReducer(undefined, { type: '@@INIT' });

describe('app slice - sidebarSectionSizes', () => {
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

  it('removes a section size by id (leaving the rest)', () => {
    let state = appReducer(baseState(), updateSidebarSectionSizes({ 'collections': 4, 'api-specs': 1 }));
    state = appReducer(state, removeSidebarSectionSize('api-specs'));
    expect(state.sidebarSectionSizes).toEqual({ collections: 4 });
  });
});

describe('app slice - sidebarExpandedSections', () => {
  it('starts with collections expanded', () => {
    expect(baseState().sidebarExpandedSections).toEqual(['collections']);
  });

  it('adds and removes a section id without duplicating', () => {
    let state = appReducer(baseState(), setSidebarSectionExpanded({ id: 'api-specs', expanded: true }));
    expect(state.sidebarExpandedSections).toEqual(['collections', 'api-specs']);
    // expanding again is a no-op (no duplicate)
    state = appReducer(state, setSidebarSectionExpanded({ id: 'api-specs', expanded: true }));
    expect(state.sidebarExpandedSections).toEqual(['collections', 'api-specs']);
    state = appReducer(state, setSidebarSectionExpanded({ id: 'collections', expanded: false }));
    expect(state.sidebarExpandedSections).toEqual(['api-specs']);
  });

  it('replaces the list from a hydrated array, dropping non-strings', () => {
    const state = appReducer(baseState(), setSidebarExpandedSections(['api-specs', 'dummy', 5, null]));
    expect(state.sidebarExpandedSections).toEqual(['api-specs', 'dummy']);
  });

  it('ignores a non-array payload', () => {
    const state = appReducer(baseState(), setSidebarExpandedSections('nope'));
    expect(state.sidebarExpandedSections).toEqual(['collections']);
  });
});
