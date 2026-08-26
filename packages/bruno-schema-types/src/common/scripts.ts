export interface HTTPScripts {
  req?: string | null;
  res?: string | null;
}

export interface GrpcScripts {
  beforeCallStart?: string | null;
  afterCallEnd?: string | null;
}

export interface Script extends HTTPScripts, GrpcScripts {}
