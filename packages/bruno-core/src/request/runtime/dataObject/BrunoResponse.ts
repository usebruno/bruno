import { Response } from '../../types';

export class BrunoResponse {
  constructor(private _res: Response, public body: any) {}

  get status() {
    return this.getStatus();
  }
  getStatus(): number {
    return this._res.statusCode;
  }

  getHeader(name: string): string | undefined {
    const header = this._res.headers[name];

    return Array.isArray(header) ? header[0] : header;
  }

  get headers() {
    return this.getHeaders();
  }
  getHeaders() {
    return this._res.headers;
  }

  getBody() {
    return this.body;
  }

  get responseTime() {
    return this.getResponseTime();
  }
  getResponseTime() {
    return this._res.responseTime;
  }
}
