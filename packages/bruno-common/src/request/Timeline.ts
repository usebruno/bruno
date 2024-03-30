export type RequestTimeline = {
  requestHeaders: Record<string, string>;
  responseHeader: Record<string, string | string[] | undefined>;
  statusCode: number;
  info: string;
};

export class Timeline {
  private requests: RequestTimeline[] = [];

  public add(request: RequestTimeline) {
    this.requests.push(request);
  }

  public toJSON() {
    return this.requests;
  }
}
