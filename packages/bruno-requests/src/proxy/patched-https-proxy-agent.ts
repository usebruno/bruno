import { HttpsProxyAgent, HttpsProxyAgentOptions } from 'https-proxy-agent';
import type { ClientRequestArgs } from 'http';
import type { Socket } from 'net';

export class PatchedHttpsProxyAgent extends HttpsProxyAgent<string> {
  private constructorOpts: HttpsProxyAgentOptions<string>;

  constructor(proxy: string, opts?: HttpsProxyAgentOptions<string>) {
    super(proxy, opts);
    this.constructorOpts = opts || {};
  }

  async connect(req: ClientRequestArgs, opts: { host: string; port: number }): Promise<Socket> {
    const combinedOpts = { ...this.constructorOpts, ...opts };
    return super.connect(req, combinedOpts as any);
  }
}
