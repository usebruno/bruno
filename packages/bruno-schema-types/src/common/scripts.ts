export interface HttpScript {
  req?: string | null;
  res?: string | null;
}

export interface GrpcScript {
  beforeCallStart?: string | null;
  beforeMessageSend?: string | null;
  afterMessageReceive?: string | null;
  afterCallEnd?: string | null;
}

export interface Script extends HttpScript, GrpcScript { }
