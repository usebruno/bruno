export type RequestTimeline = {
  requestMethod: string;
  requestUrl: string;
  requestHeaders: Record<string, string>;
  responseHeader: Record<string, string | string[] | undefined>;
  statusCode: number;
  info: string;
};

export class Timeline extends Array {
  public add(request: RequestTimeline) {
    this.push(request);
  }
}
