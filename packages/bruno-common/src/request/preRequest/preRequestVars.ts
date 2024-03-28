import { RequestContext } from '../types';
import { VarsRuntime } from '@usebruno/js';

export function preRequestVars(context: RequestContext) {
  const preRequestVars = context.requestItem.request.vars.req;
  // TODO: Always set preRequestVars
  if (preRequestVars === undefined) {
    context.debug.log('preRequestVars Skipped');
    return;
  }

  const before = structuredClone(context.variables.collection);

  const varsRuntime = new VarsRuntime();
  // This will update context.variables.collection by reference inside the 'Bru' class
  varsRuntime.runPreRequestVars(
    preRequestVars,
    context.requestItem.request,
    context.variables.environment,
    context.variables.collection,
    context.collection.pathname,
    context.variables.process
  );

  context.debug.log('preRequestVars', { before, after: context.variables.collection });
}
