import { RequestContext } from '../types';
import { runScript } from '@usebruno/js';
import { EOL } from 'node:os';

export async function postRequestScript(context: RequestContext) {
  const collectionPostRequestScript = context.collection.request.script.res ?? '';
  const requestPostRequestScript = context.requestItem.request.script.res ?? '';
  const postRequestScript = collectionPostRequestScript + EOL + requestPostRequestScript;

  context.debug.log('postRequestScript', {
    collectionPostRequestScript,
    requestPostRequestScript,
    postRequestScript
  });
  context.timings.startMeasure('post-script');

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
      false,
      context.collection.pathname,
      context.collection.brunoConfig.scripts,
      (...args) => console.warn('TODO: Implement console.log callback', args)
    );
  } catch (error) {
    context.debug.log('postRequestScript Error', { error });

    throw error;
  } finally {
    context.timings.stopMeasure('post-script');
  }

  // TODO: IPC -> `main:script-environment-update`

  context.debug.log('postRequestScript Finished', scriptResult);

  // The script will use `cleanJson` to remove any weird things before sending to the mainWindow
  // This destroys the references, so we update variables here manually
  context.variables.collection = scriptResult.collectionVariables;
  context.variables.environment = scriptResult.envVariables;
}
