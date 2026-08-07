export interface HTTPScripts {
  req?: string | null;
  res?: string | null;
}

export interface GrpcScript {
  beforeCallStart?: string | null;
  afterCallEnd?: string | null;
}

export interface Script extends HTTPScripts, GrpcScript {}
