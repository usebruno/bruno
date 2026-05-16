import { moveCollectionAndPersist } from './actions';
import { moveCollection } from './index';

describe('moveCollectionAndPersist', () => {
  const collectionA = { uid: 'col-a', pathname: '/workspace/a' };
  const collectionB = { uid: 'col-b', pathname: '/workspace/b' };
  const collectionC = { uid: 'col-c', pathname: '/workspace/c' };

  beforeEach(() => {
    window.ipcRenderer = {
      invoke: jest.fn().mockResolvedValue(undefined)
    };
  });

  it('persists collection pathnames with the dragged collection after the target when placement is after', async () => {
    const dispatch = jest.fn();
    const getState = () => ({
      collections: {
        collections: [collectionA, collectionB, collectionC]
      },
      workspaces: {
        activeWorkspaceUid: 'ws-1',
        workspaces: [
          {
            uid: 'ws-1',
            pathname: '/workspace/workspace.yml',
            collections: [
              { path: '/workspace/a' },
              { path: '/workspace/b' },
              { path: '/workspace/c' }
            ]
          }
        ]
      }
    });

    await moveCollectionAndPersist({
      draggedItem: collectionA,
      targetItem: collectionB,
      placement: 'after'
    })(dispatch, getState);

    expect(window.ipcRenderer.invoke).toHaveBeenCalledWith(
      'renderer:reorder-workspace-collections',
      '/workspace/workspace.yml',
      ['/workspace/b', '/workspace/a', '/workspace/c']
    );
    expect(dispatch).toHaveBeenCalledWith(
      moveCollection({
        draggedItem: collectionA,
        targetItem: collectionB,
        placement: 'after'
      })
    );
  });
});
