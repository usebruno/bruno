export type NtlmRequest = {
  socketId: number;
  type: number | null;
  url: string;
  body: string;
  headers: Record<string, string | undefined>;
  clientCertName?: string;
  provedPassword?: boolean;
};

export type NtlmEndpoint = {
  baseUrl: string;
  requests: NtlmRequest[];
  certPath?: string;
  clientCertPath?: string;
  clientKeyPath?: string;
  clientCertName: string;
  messageTypesSeen: () => Array<number | null>;
  negotiations: () => NtlmRequest[];
  connectionsUsed: () => number;
  close: () => Promise<void>;
};

export const startNtlmServer: (options?: {
  tls?: boolean;
  password?: string;
  requireClientCert?: boolean;
}) => Promise<NtlmEndpoint>;
