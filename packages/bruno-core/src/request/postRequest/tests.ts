import { RequestContext } from '../types';
import { EOL } from 'node:os';
import { runScript } from '../runtime/script-runner';

export async function tests(context: RequestContext, responseBody: any) {
  const collectionPostRequestScript = context.collection.root?.request?.tests ?? '';
  const requestPostRequestScript = context.requestItem.request.tests ?? '';
  const postRequestScript = collectionPostRequestScript + EOL + requestPostRequestScript;

  context.debug.log('Test script', {
    collectionPostRequestScript,
    requestPostRequestScript,
    postRequestScript
  });
  context.timings.startMeasure('test');

  let scriptResult;
  try {
    scriptResult = await runScript(
      postRequestScript,
      context.requestItem,
      context.response!,
      responseBody,
      context.variables,
      true,
      context.collection.pathname,
      context.collection.brunoConfig.scripts,
      (type: string, payload: any) => context.callback.consoleLog(type, payload)
    );
  } catch (error) {
    context.debug.log('Test script error', { error });

    throw error;
  } finally {
    context.timings.stopMeasure('test');
  }

  context.callback.testResults(context, scriptResult.results);
  context.callback.folderTestResults(context, scriptResult.results);
  context.callback.updateScriptEnvironment(context, scriptResult.envVariables, scriptResult.collectionVariables);

  context.debug.log('Test script finished', scriptResult);
}
