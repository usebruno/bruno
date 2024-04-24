import { HttpRequestInfo } from './httpRequest/httpRequest';

export class Timeline extends Array<HttpRequestInfo> {
  public add(request: HttpRequestInfo) {
    const unref = { ...request };
    delete unref.responseBody;
    this.push(unref);
  }
}
