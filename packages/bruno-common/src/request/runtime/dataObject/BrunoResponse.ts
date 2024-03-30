export class BrunoResponse {
  constructor(private _res: any) {}

  getStatus(): number {
    return this._res.statusCode;
  }

  getHeader(name: string): string | undefined {
    return this._res.headers[name];
  }

  getHeaders() {
    return this._res.headers;
  }

  getBody() {
    return this._res.body;
  }

  getResponseTime() {
    // TODO
    // @ts-expect-error
    return this.responseTime;
  }
}
