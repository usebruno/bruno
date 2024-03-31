import { RequestContext } from '../types';
import { VarsRuntime } from '../runtime/vars-runtime';

export function postRequestVars(context: RequestContext) {
  const postRequestVars = context.requestItem.request.vars.res;
  // TODO: Always set postRequestVars
  if (postRequestVars === undefined) {
    context.debug.log('preRequestVars Skipped');
    return;
  }

  const before = structuredClone(context.variables.collection);

  const varsRuntime = new VarsRuntime();
  // This will update context.variables.collection by reference inside the 'Bru' class
  varsRuntime.runPostResponseVars(
    postRequestVars,
    context.requestItem,
    context.response!,
    context.variables.environment,
    context.variables.collection,
    context.collection.pathname,
    context.variables.process
  );

  context.debug.log('preRequestVars', { before, after: context.variables.collection });
}
