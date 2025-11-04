import get from 'lodash/get';
import each from 'lodash/each';
import filter from 'lodash/filter';
import { createListenerMiddleware } from '@reduxjs/toolkit';
import { removeTaskFromQueue, hideHomePage } from 'providers/ReduxStore/slices/app';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { collectionAddFileEvent, collectionChangeFileEvent } from 'providers/ReduxStore/slices/collections';
import { findCollectionByUid, findItemInCollectionByPathname, getDefaultRequestPaneTab } from 'utils/collections/index';
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
          if (item) {
            listenerApi.dispatch(
              addTab({
                uid: item.uid,
                collectionUid: collection.uid,
                requestPaneTab: getDefaultRequestPaneTab(item)
              })
            );
            listenerApi.dispatch(hideHomePage());
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
    const itemPathname = get(action, 'payload.file.meta.pathname');

    const openExampleTasks = filter(state.app.taskQueue, { type: taskTypes.OPEN_EXAMPLE });
    each(openExampleTasks, (task) => {
      if (collectionUid === task.collectionUid && itemPathname === task.itemPathname) {
        const collection = findCollectionByUid(state.collections.collections, collectionUid);
        if (collection && collection.mountStatus === 'mounted' && !collection.isLoading) {
          const item = findItemInCollectionByPathname(collection, task.itemPathname);
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
              listenerApi.dispatch(hideHomePage());
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

export default taskMiddleware;
