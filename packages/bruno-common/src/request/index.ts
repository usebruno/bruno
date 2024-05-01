import { DebugLogger } from './DebugLogger';
import { Timings } from './Timings';
import { Collection, CollectionEnvironment, Preferences, RequestContext, RequestItem } from './types';
import { preRequestVars } from './preRequest/preRequestVars';
import { preRequestScript } from './preRequest/preRequestScript';
import { applyCollectionSettings } from './preRequest/applyCollectionSettings';
import { createHttpRequest } from './preRequest/createHttpRequest';
import { postRequestVars } from './postRequest/postRequestVars';
import { postRequestScript } from './postRequest/postRequestScript';
import { assertions } from './postRequest/assertions';
import { tests } from './postRequest/tests';
import { interpolateRequest } from './preRequest/interpolateRequest';
import { Callbacks, RawCallbacks } from './Callbacks';
import { nanoid } from 'nanoid';
import { join } from 'node:path';
import { rm } from 'node:fs/promises';
import { makeHttpRequest } from './httpRequest/requestHandler';

export async function request(
  requestItem: RequestItem,
  collection: Collection,
  prefences: Preferences,
  dataDir: string,
  cancelToken: string,
  abortController: AbortController,
  environment?: CollectionEnvironment,
  rawCallbacks: Partial<RawCallbacks> = {}
) {
  // Convert the EnvVariables into a Record
  const environmentVariableRecord = (environment?.variables ?? []).reduce<Record<string, unknown>>((acc, env) => {
    if (env.enabled) {
      acc[env.name] = env.value;
    }
    return acc;
  }, {});

  const context: RequestContext = {
    uid: nanoid(),
    dataDir,
    cancelToken,
    abortController,

    requestItem,
    collection,
    prefences,
    variables: {
      process: {
        process: {
          // @ts-ignore
          env: process.env
        }
      },
      environment: environmentVariableRecord,
      collection: collection.collectionVariables
    },

    callback: new Callbacks(rawCallbacks),
    timings: new Timings(),
    debug: new DebugLogger()
  };

  const targetPath = join(context.dataDir, context.requestItem.uid);
  await rm(targetPath, { force: true });

  try {
    return await doRequest(context);
  } catch (error) {
    context.error = error instanceof Error ? error : new Error(String(error));
  } finally {
    context.timings.stopAll();
  }

  return context;
}

async function doRequest(context: RequestContext): Promise<RequestContext> {
  context.timings.startMeasure('total');
  context.debug.addStage('Pre-Request');

  context.callback.requestQueued(context);
  context.callback.folderRequestQueued(context);

  applyCollectionSettings(context);
  preRequestVars(context);
  await preRequestScript(context);
  interpolateRequest(context);
  await createHttpRequest(context);

  context.callback.requestSend(context);

  context.debug.addStage('Request');
  context.timings.startMeasure('request');
  await makeHttpRequest(context);
  context.timings.stopMeasure('request');

  context.debug.addStage('Post-Request');
  // TODO: Collect cookies from headers
  postRequestVars(context);
  await postRequestScript(context);
  assertions(context);
  await tests(context);

  context.timings.stopMeasure('total');

  context.callback.folderResponseReceived(context);

  return context;
}
