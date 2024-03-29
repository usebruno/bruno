import { DebugLogger } from './DebugLogger';
import { Timings } from './Timings';
import { Collection, CollectionEnvironment, RequestContext, RequestItem } from './types';
import { preRequestVars } from './preRequest/preRequestVars';
import { preRequestScript } from './preRequest/preRequestScript';
import { applyCollectionSettings } from './preRequest/applyCollectionSettings';
import { createUndiciRequest } from './preRequest/createUndiciRequest';
import { undiciRequest } from './undiciRequest';

export async function request(requestItem: RequestItem, collection: Collection, environment?: CollectionEnvironment) {
  // Convert the EnvVariables into a Record
  const environmentVariableRecord = (environment?.variables ?? []).reduce<Record<string, unknown>>((acc, env) => {
    if (env.enabled) {
      acc[env.name] = env.value;
    }
    return acc;
  }, {});

  const context: RequestContext = {
    collection,
    requestItem,
    variables: {
      // TODO: .env variables
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
    context.timings.stopAll();
  }

  return context;
}

async function doRequest(context: RequestContext): Promise<RequestContext> {
  context.timings.startMeasure('total');
  context.debug.addStage('pre-request');

  // TODO: IPC -> `main:run-request-event`
  applyCollectionSettings(context);
  preRequestVars(context);
  await preRequestScript(context);
  createUndiciRequest(context);

  context.debug.addStage('request');
  context.timings.startMeasure('request');
  await undiciRequest(context);
  context.timings.stopMeasure('request');

  context.debug.addStage('post-request');
  // TODO: Collect cookies from headers

  context.timings.stopMeasure('total');
  return context;
}
