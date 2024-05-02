import { HttpRequestInfo } from './httpRequest/httpRequest';

export class Timeline extends Array<HttpRequestInfo> {
  public add(request: HttpRequestInfo) {
    const unref = { ...request };
    if (unref.responseBody) {
      // @ts-expect-error This is used for in the TimelineNew component in the frontned
      unref.responseBody = unref.responseBody.toString().slice(0, 2048);
    }
    this.push(unref);
  }
}
