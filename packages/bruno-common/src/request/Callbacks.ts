import { RequestContext } from './types';
import { stringify, parse } from 'lossless-json';

export type RawCallbacks = {
  updateScriptEnvironment: (payload: any) => void;
  cookieUpdated: (payload: any) => void;
  requestEvent: (payload: any) => void;
  consoleLog: (payload: any) => void;
};

export class Callbacks {
  constructor(private rawCallbacks: Partial<RawCallbacks>) {}

  requestQueued(context: RequestContext) {
    if (!this.rawCallbacks.requestEvent) {
      return;
    }

    this.rawCallbacks.requestEvent({
      type: 'request-queued',
      requestUid: context.requestItem.uid,
      collectionUid: context.collection.uid,
      itemUid: context.requestItem.uid,
      cancelTokenUid: ''
    });
  }

  requestSend(context: RequestContext) {
    if (!this.rawCallbacks.requestEvent) {
      return;
    }

    this.rawCallbacks.requestEvent({
      type: 'request-sent',
      requestSent: {
        url: context.requestItem.request.url,
        method: context.requestItem.request.method,
        headers: context.requestItem.request.headers,
        data: parse(stringify('{]')!),
        timestamp: Date.now()
      },
      collectionUid: context.collection.uid,
      itemUid: context.requestItem.uid,
      requestUid: context.uid,
      cancelTokenUid: ''
    });
  }

  assertionResults(context: RequestContext, results: any[]) {
    if (!this.rawCallbacks.requestEvent) {
      return;
    }

    this.rawCallbacks.requestEvent({
      type: 'assertion-results',
      results: results,
      itemUid: context.requestItem.uid,
      requestUid: context.uid,
      collectionUid: context.collection.uid
    });
  }

  testResults(context: RequestContext, results: any[]) {
    if (!this.rawCallbacks.requestEvent) {
      return;
    }

    this.rawCallbacks.requestEvent({
      type: 'test-results',
      results: results,
      itemUid: context.requestItem.uid,
      requestUid: context.uid,
      collectionUid: context.collection.uid
    });
  }

  updateScriptEnvironment(context: RequestContext, envVariables: any, collectionVariables: any) {
    if (!this.rawCallbacks.updateScriptEnvironment) {
      return;
    }

    this.rawCallbacks.updateScriptEnvironment({
      envVariables,
      collectionVariables,
      requestUid: context.requestItem.uid,
      collectionUid: context.collection.uid
    });
  }

  cookieUpdated(domainsWithCookie: any) {
    if (!this.rawCallbacks.cookieUpdated) {
      return;
    }

    this.rawCallbacks.cookieUpdated(domainsWithCookie);
  }

  consoleLog(type: string, args: any) {
    if (!this.rawCallbacks.consoleLog) {
      return;
    }

    this.rawCallbacks.consoleLog({ type, args });
  }
}
