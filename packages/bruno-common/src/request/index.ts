import { DebugLogger } from './DebugLogger';
import { Timings } from './Timings';
import { Collection, CollectionEnvironment, RequestContext, RequestItem } from './types';
import { preRequestVars } from './preRequest/preRequestVars';
import { preRequestScript } from './preRequest/preRequestScript';
import { applyCollectionSettings } from './preRequest/applyCollectionSettings';
import { createUndiciRequest } from './preRequest/createUndiciRequest';
import { undiciRequest } from './undiciRequest/undiciRequest';
import { postRequestVars } from './postRequest/postRequestVars';
import { postRequestScript } from './postRequest/postRequestScript';
import { assertions } from './postRequest/assertions';
import { tests } from './postRequest/tests';
import { interpolateRequest } from './preRequest/interpolateRequest';
import { Callbacks, RawCallbacks } from './Callbacks';
import { nanoid } from 'nanoid';
import { safeParseJSON } from '@usebruno/app/src/utils/common';
import { cleanJson } from './runtime/utils';

export async function request(
  requestItem: RequestItem,
  collection: Collection,
  dataDir: string,
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
    collection,
    requestItem,
    callback: new Callbacks(rawCallbacks),
    dataDir,
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
    timings: new Timings(),
    debug: new DebugLogger()
  };

  try {
    return await doRequest(context);
  } catch (error) {
    context.error = error instanceof Error ? error : new Error(String(error));
  } finally {
    context.timings.stopAll();
  }

  return cleanJson(context);
}

async function doRequest(context: RequestContext): Promise<RequestContext> {
  context.timings.startMeasure('total');
  context.debug.addStage('pre-request');

  context.callback.requestQueued(context);

  applyCollectionSettings(context);
  preRequestVars(context);
  await preRequestScript(context);
  interpolateRequest(context);
  await createUndiciRequest(context);

  context.callback.requestSend(context);

  context.debug.addStage('request');
  context.timings.startMeasure('request');
  await undiciRequest(context);
  context.timings.stopMeasure('request');

  context.debug.addStage('post-request');
  // TODO: Collect cookies from headers
  postRequestVars(context);
  await postRequestScript(context);
  assertions(context);
  await tests(context);

  context.timings.stopMeasure('total');

  return context;
}
