import get from 'lodash/get';
import each from 'lodash/each';
import filter from 'lodash/filter';
import { createListenerMiddleware } from '@reduxjs/toolkit';
import { removeTaskFromQueue } from 'providers/ReduxStore/slices/app';
import { addTab, closeTabs, closeAllCollectionTabs } from 'providers/ReduxStore/slices/tabs';
import { collectionAddFileEvent, collectionChangeFileEvent } from 'providers/ReduxStore/slices/collections';
import { findCollectionByUid, findItemInCollectionByPathname, getDefaultRequestPaneTab, findItemInCollectionByItemUid, findItemInCollection, flattenItems } from 'utils/collections/index';
import { taskTypes } from './utils';

const taskMiddleware = createListenerMiddleware();

/*
 * When a new request is created in the app, a task to open the request is added to the queue.
 * We wait for the File IO to complete, after which the "collectionAddFileEvent" gets dispatched.
 * This middleware listens for the event and checks if there is a task in the queue that matches
 * the collectionUid and itemPathname. If there is a match, we open the request and remove the task
 * from the queue.
 */
taskMiddleware.startListening({
  actionCreator: collectionAddFileEvent,
  effect: (action, listenerApi) => {
    const state = listenerApi.getState();
    const collectionUid = get(action, 'payload.file.meta.collectionUid');

    const openRequestTasks = filter(state.app.taskQueue, { type: taskTypes.OPEN_REQUEST });
    each(openRequestTasks, (task) => {
      if (collectionUid === task.collectionUid) {
        const collection = findCollectionByUid(state.collections.collections, collectionUid);
        if (collection && collection.mountStatus === 'mounted' && !collection.isLoading) {
          const item = findItemInCollectionByPathname(collection, task.itemPathname);
          const isTransient = item?.isTransient ?? false;
          if (item) {
            listenerApi.dispatch(
              addTab({
                uid: item.uid,
                collectionUid: collection.uid,
                requestPaneTab: getDefaultRequestPaneTab(item),
                preview: !isTransient
              })
            );
          }
        }

        listenerApi.dispatch(
          removeTaskFromQueue({
            taskUid: task.uid
          })
        );
      }
    });
  }
});

/*
 * When an example is created or cloned, a task to open the example is added to the queue.
 * We wait for the File IO to complete, after which the "collectionChangeFileEvent" gets dispatched.
 * This middleware listens for the event and checks if there is a task in the queue that matches
 * the collectionUid, itemPathname, and exampleIndex. If there is a match, we open the example
 * tab and remove the task from the queue.
 */
taskMiddleware.startListening({
  actionCreator: collectionChangeFileEvent,
  effect: (action, listenerApi) => {
    const state = listenerApi.getState();
    const collectionUid = get(action, 'payload.file.meta.collectionUid');

    const openExampleTasks = filter(state.app.taskQueue, { type: taskTypes.OPEN_EXAMPLE });
    each(openExampleTasks, (task) => {
      if (collectionUid === task.collectionUid) {
        const collection = findCollectionByUid(state.collections.collections, collectionUid);
        if (collection && collection.mountStatus === 'mounted' && !collection.isLoading) {
          const item = findItemInCollectionByItemUid(collection, task.itemUid);
          if (item && item.examples && item.examples.length > task.exampleIndex) {
            const example = item.examples[task.exampleIndex];
            if (example) {
              listenerApi.dispatch(addTab({
                uid: example.uid,
                exampleUid: example.uid,
                collectionUid: collection.uid,
                type: 'response-example',
                itemUid: item.uid
              }));
            }
          }
        }

        listenerApi.dispatch(removeTaskFromQueue({
          taskUid: task.uid
        }));
      }
    });
  }
});

/*
 * When tabs are closed, check if any of them are transient requests.
 * If so, delete the temporary files from the filesystem.
 * Note: If a transient request was saved (moved to permanent location),
 * the file will already be deleted, which is expected behavior.
 */
taskMiddleware.startListening({
  actionCreator: closeTabs,
  effect: (action, listenerApi) => {
    const state = listenerApi.getState();
    const tabUids = action.payload.tabUids || [];
    const { ipcRenderer } = window;

    each(tabUids, (tabUid) => {
      const collections = state.collections.collections;

      for (const collection of collections) {
        const item = findItemInCollection(collection, tabUid);
        const isTransient = item?.isTransient ?? false;
        if (item && isTransient) {
          ipcRenderer
            .invoke('renderer:delete-item', item.pathname, item.type, collection.pathname)
            .then(() => {})
            .catch((err) => {
              if (err.message && !err.message.includes('does not exist')) {
                console.error(`Failed to delete transient request file: ${item.pathname}`, err);
              }
            });

          break;
        }
      }
    });
  }
});
export default taskMiddleware;
