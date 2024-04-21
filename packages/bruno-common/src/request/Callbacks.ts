import { RequestContext } from './types';
import { stringify, parse } from 'lossless-json';

type Callback = (payload: any) => void;
export type RawCallbacks = {
  updateScriptEnvironment: Callback;
  cookieUpdated: Callback;
  requestEvent: Callback;
  runFolderEvent: Callback;
  consoleLog: Callback;
};

export class Callbacks {
  constructor(private rawCallbacks: Partial<RawCallbacks>) {}

  private send(callbackName: keyof RawCallbacks, context: RequestContext, payload: any) {
    const callback = this.rawCallbacks[callbackName];
    if (!callback || context.abortController?.signal.aborted === true) {
      return;
    }
    callback(payload);
  }

  requestQueued(context: RequestContext) {
    this.send('requestEvent', context, {
      type: 'request-queued',
      requestUid: context.requestItem.uid,
      collectionUid: context.collection.uid,
      itemUid: context.requestItem.uid,
      cancelTokenUid: context.cancelToken
    });
  }

  requestSend(context: RequestContext) {
    this.send('requestEvent', context, {
      type: 'request-sent',
      requestSent: {
        url: context.requestItem.request.url,
        method: context.requestItem.request.method,
        headers: context.requestItem.request.headers,
        data: parse(stringify('{}')!),
        timestamp: Date.now()
      },
      collectionUid: context.collection.uid,
      itemUid: context.requestItem.uid,
      requestUid: context.uid,
      cancelTokenUid: ''
    });
  }

  assertionResults(context: RequestContext, results: any[]) {
    this.send('requestEvent', context, {
      type: 'assertion-results',
      results: results,
      itemUid: context.requestItem.uid,
      requestUid: context.uid,
      collectionUid: context.collection.uid
    });
  }

  testResults(context: RequestContext, results: any[]) {
    this.send('requestEvent', context, {
      type: 'test-results',
      results: results,
      itemUid: context.requestItem.uid,
      requestUid: context.uid,
      collectionUid: context.collection.uid
    });
  }

  updateScriptEnvironment(context: RequestContext, envVariables: any, collectionVariables: any) {
    this.send('updateScriptEnvironment', context, {
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

  folderRequestQueued(context: RequestContext) {
    this.send('runFolderEvent', context, {
      type: 'request-queued',
      itemUid: context.requestItem.uid,
      collectionUid: context.collection.uid
    });
  }

  folderRequestSent(context: RequestContext) {
    this.send('runFolderEvent', context, {
      type: 'request-sent',
      requestSent: {
        url: context.undiciRequest!.url,
        method: context.undiciRequest!.options.method,
        headers: context.undiciRequest!.options.headers,
        data: context.undiciRequest!.options.body ?? undefined,
        timestamp: Date.now()
      },
      isNew: true,
      itemUid: context.requestItem.uid,
      collectionUid: context.collection.uid
    });
  }

  folderResponseReceived(context: RequestContext) {
    this.send('runFolderEvent', context, {
      type: 'response-received',
      responseReceived: {
        status: context.response?.statusCode,
        statusText: 'TODO',
        headers: context.response?.headers,
        duration: context.response?.responseTime,
        size: context.response?.headers['content-size'] ?? 0,
        responseTime: context.response?.responseTime
      },
      timeline: context.timeline,
      timings: context.timings.getClean(),
      debug: context.debug.getClean(),
      itemUid: context.requestItem.uid,
      collectionUid: context.collection.uid
    });
  }

  folderAssertionResults(context: RequestContext, results: any[]) {
    this.send('runFolderEvent', context, {
      type: 'assertion-results',
      assertionResults: results,
      itemUid: context.requestItem.uid,
      collectionUid: context.collection.uid
    });
  }

  folderTestResults(context: RequestContext, results: any[]) {
    this.send('runFolderEvent', context, {
      type: 'test-results',
      testResults: results,
      itemUid: context.requestItem.uid,
      collectionUid: context.collection.uid
    });
  }
}
