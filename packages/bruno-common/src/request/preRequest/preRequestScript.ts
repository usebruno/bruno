import { RequestContext } from '../types';
import { runScript } from '@usebruno/js';
import { EOL } from 'node:os';

export async function preRequestScript(context: RequestContext) {
  const collectionPreRequestScript = context.collection.request.script.req ?? '';
  const requestPreRequestScript = context.requestItem.request.script.req ?? '';
  const preRequestScript = collectionPreRequestScript + EOL + requestPreRequestScript;

  context.debug.log('preRequestScript', {
    collectionPreRequestScript,
    requestPreRequestScript,
    preRequestScript
  });
  context.timings.startMeasure('pre-script');

  let scriptResult;
  try {
    scriptResult = await runScript(
      preRequestScript,
      context.requestItem.request,
      null,
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
    context.debug.log('preRequestScript Error', { error });

    throw error;
  } finally {
    context.timings.stopMeasure('pre-script');
  }

  // TODO: IPC -> `main:script-environment-update`

  context.debug.log('preRequestScript Finished', scriptResult);

  // The script will use `cleanJson` to remove any weird things before sending to the mainWindow
  // This destroys the references, so we update variables here manually
  context.variables.collection = scriptResult.collectionVariables;
  context.variables.environment = scriptResult.envVariables;
}
