import get from 'lodash/get';
import each from 'lodash/each';
import filter from 'lodash/filter';
import { createListenerMiddleware } from '@reduxjs/toolkit';
import { removeTaskFromQueue } from 'providers/ReduxStore/slices/app';
import { addTab } from 'providers/ReduxStore/slices/tabs';
import { collectionAddFileEvent, collectionChangeFileEvent, collectionBatchAddItems } from 'providers/ReduxStore/slices/collections';
import { findCollectionByUid, findItemInCollectionByPathname, getDefaultRequestPaneTab, findItemInCollectionByItemUid } from 'utils/collections/index';
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
                requestPaneTab: getDefaultRequestPaneTab(item),
                preview: task?.preview ?? true
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
 * When files are added via batch processing (e.g., during collection mount or when new files are created),
 * we need to check if any of the added files match pending OPEN_REQUEST tasks.
 * This handles the case where file additions go through the batch reducer instead of individual events.
 */
taskMiddleware.startListening({
  actionCreator: collectionBatchAddItems,
  effect: (action, listenerApi) => {
    const state = listenerApi.getState();
    const items = action.payload?.items || [];

    // Extract all addFile events from the batch
    const addFileItems = items.filter((item) => item.eventType === 'addFile');
    if (addFileItems.length === 0) return;

    const openRequestTasks = filter(state.app.taskQueue, { type: taskTypes.OPEN_REQUEST });
    if (openRequestTasks.length === 0) return;

    each(addFileItems, ({ payload: file }) => {
      const collectionUid = file?.meta?.collectionUid;
      if (!collectionUid) return;

      each(openRequestTasks, (task) => {
        if (collectionUid === task.collectionUid && file?.meta?.pathname === task.itemPathname) {
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

export default taskMiddleware;
