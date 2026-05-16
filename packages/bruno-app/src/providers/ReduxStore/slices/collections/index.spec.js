import reducer, { moveCollection } from './index';

describe('collections reducer', () => {
  it('moves the dragged collection after the target when placement is after', () => {
    const initialState = {
      collections: [
        { uid: 'col-a', pathname: '/workspace/a' },
        { uid: 'col-b', pathname: '/workspace/b' },
        { uid: 'col-c', pathname: '/workspace/c' }
      ],
      collectionSortOrder: 'default',
      activeConnections: [],
      tempDirectories: {},
      saveTransientRequestModals: []
    };

    const nextState = reducer(
      initialState,
      moveCollection({
        draggedItem: initialState.collections[0],
        targetItem: initialState.collections[1],
        placement: 'after'
      })
    );

    expect(nextState.collections.map((collection) => collection.uid)).toEqual(['col-b', 'col-a', 'col-c']);
  });
});
