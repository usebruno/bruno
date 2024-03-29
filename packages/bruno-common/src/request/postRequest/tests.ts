import { RequestContext } from '../types';
import { EOL } from 'node:os';
import { runScript } from '@usebruno/js';

export async function tests(context: RequestContext) {
  const collectionPostRequestScript = context.collection.request.tests ?? '';
  const requestPostRequestScript = context.requestItem.request.tests ?? '';
  const postRequestScript = collectionPostRequestScript + EOL + requestPostRequestScript;

  context.debug.log('test', {
    collectionPostRequestScript,
    requestPostRequestScript,
    postRequestScript
  });
  context.timings.startMeasure('test');

  let scriptResult;
  try {
    scriptResult = await runScript(
      postRequestScript,
      context.requestItem.request,
      context.response,
      {
        envVariables: context.variables.environment,
        collectionVariables: context.variables.collection,
        processEnvVars: context.variables.process
      },
      true,
      context.collection.pathname,
      context.collection.brunoConfig.scripts,
      (...args) => console.warn('TODO: Implement console.log callback', args)
    );
  } catch (error) {
    context.debug.log('test Error', { error });

    throw error;
  } finally {
    context.timings.stopMeasure('test');
  }

  // TODO: IPC -> `main:script-environment-update`

  context.debug.log('test Finished', scriptResult);

  // TODO: Updates to env variables are ignored here?
}
