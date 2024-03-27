import { DebugLogger } from './DebugLogger';
import { Timings } from './Timings';
import { Collection, CollectionEnvironment, RequestContext, RequestItem } from './types';
import { VarsRuntime, AssertRuntime, runScript } from '@usebruno/js';

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
      process: process.env,
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

  context.timings.stopMeasure('total');
  return context;
}
