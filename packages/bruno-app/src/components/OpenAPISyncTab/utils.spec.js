import { categorizeEndpoints } from './utils';

const pets = { id: 'GET:/pets', method: 'GET', path: '/pets' };

const categorize = ({ conflictingFields = [], specChanged = true, locallyEdited = false, noStoredSpec = false }) => categorizeEndpoints(
  { modified: [{ ...pets, conflictingFields }] },
  { modified: specChanged ? [pets] : [] },
  { edited: locallyEdited ? [pets] : [], noStoredSpec }
);

describe('categorizeEndpoints', () => {
  it('treats a spec change the collection did not touch as a plain spec update', () => {
    const { specUpdatedEndpoints, localUpdatedEndpoints } = categorize({});

    expect(specUpdatedEndpoints).toEqual([expect.objectContaining({ id: pets.id, specAction: 'modified' })]);
    expect(specUpdatedEndpoints[0].conflict).toBeUndefined();
    expect(localUpdatedEndpoints).toEqual([]);
  });

  it.each([
    ['name', ['name']],
    ['docs', ['docs']]
  ])('flags a conflict when the spec and the collection both changed the %s', (_field, conflictingFields) => {
    const { specUpdatedEndpoints } = categorize({ conflictingFields });

    expect(specUpdatedEndpoints[0]).toEqual(expect.objectContaining({ conflict: true, localAction: 'modified' }));
  });

  it('flags a conflict when the collection edited the request and the spec changed it', () => {
    const { specUpdatedEndpoints } = categorize({ locallyEdited: true });

    expect(specUpdatedEndpoints[0].conflict).toBe(true);
  });

  it('keeps a change made only in the collection out of the spec updates', () => {
    const { specUpdatedEndpoints, localUpdatedEndpoints } = categorize({ specChanged: false, locallyEdited: true });

    expect(specUpdatedEndpoints).toEqual([]);
    expect(localUpdatedEndpoints).toEqual([expect.objectContaining({ id: pets.id, localAction: 'modified' })]);
  });

  it('never flags a conflict without a stored spec to compare against', () => {
    const { specUpdatedEndpoints } = categorize({ conflictingFields: ['name'], locallyEdited: true, noStoredSpec: true });

    expect(specUpdatedEndpoints[0].conflict).toBeUndefined();
  });
});
