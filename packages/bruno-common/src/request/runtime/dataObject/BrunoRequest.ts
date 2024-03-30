import { Dispatcher } from 'undici';
import { RequestItem } from '../../types';

export class BrunoRequest {
  constructor(private _req: RequestItem) {}

  getUrl() {
    return this._req.request.url;
  }
  setUrl(url: string) {
    this._req.request.url = url;
  }

  getMethod() {
    return this._req.request.method;
  }

  getAuthMode() {
    return this._req.request.auth.mode;
  }

  setMethod(method: Dispatcher.HttpMethod) {
    this._req.request.method = method;
  }

  getHeaders() {
    return this._req.request.headers;
  }

  setHeaders(headers: Record<string, string>) {
    // TODO: Convert headers
    // @ts-expect-error
    this._req.request.headers = headers;
  }

  getHeader(name: string) {
    // TODO: Convert headers
    // @ts-expect-error
    return this._req.request.headers[name];
  }

  setHeader(name: string, value: string) {
    // TODO: Convert headers
    // @ts-expect-error
    this._req.request.headers[name] = value;
  }

  getBody() {
    return this._req.request.data;
  }
  setBody(data: unknown) {
    this._req.request.data = data;
  }

  setMaxRedirects(maxRedirects: number) {
    this._req.request.maxRedirects = maxRedirects;
  }

  getTimeout(): number {
    return this._req.request.timeout;
  }
  setTimeout(timeout: number) {
    this._req.request.timeout = timeout;
  }
}
