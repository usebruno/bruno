import { Response } from '../../types';
import fs from 'node:fs';
import { parse } from 'lossless-json';

export class BrunoResponse {
  constructor(private _res: Response) {}

  get status() {
    return this.getStatus();
  }
  getStatus(): number {
    return this._res.statusCode;
  }

  getHeader(name: string): string | null {
    const header = this._res.headers[name];

    return (Array.isArray(header) ? header[0] : header) ?? null;
  }

  get headers() {
    return this.getHeaders();
  }
  getHeaders() {
    return this._res.headers;
  }

  get body() {
    return this.getBody();
  }
  getBody() {
    let body: any = fs.readFileSync(this._res.path, { encoding: this._res.encoding }).toString();
    try {
      body = parse(body);
    } catch {}

    return body;
  }

  get responseTime() {
    return this.getResponseTime();
  }
  getResponseTime() {
    return this._res.responseTime;
  }
}
