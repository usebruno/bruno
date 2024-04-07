import { RequestContext } from '../types';
import { runScript } from '../runtime/script-runner';
import os from 'node:os';

export async function preRequestScript(context: RequestContext) {
  const collectionPreRequestScript = context.collection.request?.script.req ?? '';
  const requestPreRequestScript = context.requestItem.request.script.req ?? '';
  const preRequestScript = collectionPreRequestScript + os.EOL + requestPreRequestScript;

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
      context.requestItem,
      null,
      context.variables,
      false,
      context.collection.pathname,
      context.collection.brunoConfig.scripts,
      (type: string, payload: any) => context.callback.consoleLog(type, payload)
    );
  } catch (error) {
    context.debug.log('preRequestScript Error', { error });

    throw error;
  } finally {
    context.timings.stopMeasure('pre-script');
  }

  context.callback.updateScriptEnvironment(context, scriptResult.envVariables, scriptResult.collectionVariables);

  context.debug.log('preRequestScript Finished', scriptResult);

  // The script will use `cleanJson` to remove any weird things before sending to the mainWindow
  // This destroys the references, so we update variables here manually
  context.variables.collection = scriptResult.collectionVariables;
  context.variables.environment = scriptResult.envVariables;
}
