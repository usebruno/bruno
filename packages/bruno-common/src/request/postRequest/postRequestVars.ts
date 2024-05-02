import { RequestContext } from '../types';
import { VarsRuntime } from '../runtime/vars-runtime';

export function postRequestVars(context: RequestContext, responseBody: any) {
  const postRequestVars = context.requestItem.request.vars.res;
  if (postRequestVars === undefined) {
    context.debug.log('Post request variables skipped');
    return;
  }

  const before = structuredClone(context.variables.collection);

  const varsRuntime = new VarsRuntime();
  // This will update context.variables.collection by reference inside the 'Bru' class
  const varsResult = varsRuntime.runPostResponseVars(
    postRequestVars,
    context.requestItem,
    context.response!,
    responseBody,
    context.variables.environment,
    context.variables.collection,
    context.collection.pathname,
    context.variables.process
  );

  if (varsResult) {
    context.callback.updateScriptEnvironment(context, undefined, varsResult.collectionVariables);
  }

  context.debug.log('Post request variables evaluated', { before, after: context.variables.collection });
}
