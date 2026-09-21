import { resolveInitialSourceType } from './resolveInitialSourceType';

const base = {
  editingInstance: null,
  hasDefaultCollection: false,
  hasDefaultSpec: false,
  defaultSourceType: 'collection',
  hasCollectionOptions: true,
  hasSpecOptions: true
};

describe('resolveInitialSourceType', () => {
  it('keeps the source of an instance being edited', () => {
    expect(resolveInitialSourceType({ ...base, editingInstance: { sourceType: 'spec' } })).toBe('spec');
    expect(resolveInitialSourceType({ ...base, editingInstance: {} })).toBe('manual');
  });

  it('prefers a resolved default collection', () => {
    expect(resolveInitialSourceType({ ...base, hasDefaultCollection: true, hasDefaultSpec: true })).toBe('collection');
  });

  it('selects spec when a default spec resolved, regardless of requested source type', () => {
    expect(resolveInitialSourceType({ ...base, hasDefaultSpec: true, defaultSourceType: 'collection' })).toBe('spec');
  });

  it('honours a requested spec source only when spec options exist', () => {
    expect(resolveInitialSourceType({ ...base, defaultSourceType: 'spec' })).toBe('spec');
    expect(resolveInitialSourceType({ ...base, defaultSourceType: 'spec', hasSpecOptions: false })).toBe('collection');
  });

  it('falls back through collection, spec, then manual', () => {
    expect(resolveInitialSourceType(base)).toBe('collection');
    expect(resolveInitialSourceType({ ...base, hasCollectionOptions: false })).toBe('spec');
    expect(resolveInitialSourceType({ ...base, hasCollectionOptions: false, hasSpecOptions: false })).toBe('manual');
  });
});
