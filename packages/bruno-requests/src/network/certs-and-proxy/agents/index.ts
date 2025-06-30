const https = require('node:https');
const { HttpsProxyAgent } = require('https-proxy-agent');
const { SocksProxyAgent } = require('socks-proxy-agent');
const { HttpProxyAgent } = require('http-proxy-agent');

import { T_HttpsAgentRequestFields, T_SocketConnectionOptions } from '../../types';
import { SocketEventHandler } from './socket-event-handler';
import { T_LoggerInstance } from '../../../utils/logger';

/**
 * Patched version of HttpsProxyAgent to work around TLS options bug
 * https://github.com/TooTallNate/proxy-agents/issues/194
 */
class PatchedHttpsProxyAgent extends HttpsProxyAgent {
  private constructorOpts: any;

  constructor(proxy: string, opts: any) {
    super(proxy, opts);
    this.constructorOpts = opts;
  }

  async connect(req: any, opts: any): Promise<any> {
    const combinedOpts = { ...this.constructorOpts, ...opts };
    return super.connect(req, combinedOpts);
  }
}

/**
 * Agent configuration for timeline-enabled agents
 */
interface T_TimelineAgentConfig {
  agentOptions: T_HttpsAgentRequestFields;
  timeline: T_LoggerInstance;
  proxyUri?: string;
}

/**
 * Factory for creating HTTP/HTTPS agents with timeline logging
 */
export class AgentFactory {
  
  /**
   * Creates a timeline-enabled HTTPS agent
   */
  static createHttpsAgent(config: T_TimelineAgentConfig): any {
    const { agentOptions, timeline, proxyUri } = config;
    const tlsOptions = this.createTLSOptions(agentOptions);
    
    return this.createTimelineEnabledAgent(
      https.Agent,
      tlsOptions,
      timeline,
      proxyUri
    );
  }

  /**
   * Creates a timeline-enabled HTTP proxy agent
   */
  static createHttpProxyAgent(proxyUri: string): any {
    return new HttpProxyAgent(proxyUri);
  }

  /**
   * Creates a timeline-enabled HTTPS proxy agent
   */
  static createHttpsProxyAgent(config: T_TimelineAgentConfig): any {
    const { agentOptions, timeline, proxyUri } = config;
    const tlsOptions = this.createTLSOptions(agentOptions);
    
    if (!proxyUri) {
      throw new Error('Proxy URI is required for HTTPS proxy agent');
    }
    
    return this.createTimelineEnabledAgent(
      PatchedHttpsProxyAgent,
      tlsOptions,
      timeline,
      proxyUri
    );
  }

  /**
   * Creates a timeline-enabled SOCKS proxy agent
   */
  static createSocksProxyAgent(config: T_TimelineAgentConfig): any {
    const { agentOptions, timeline, proxyUri } = config;
    const tlsOptions = this.createTLSOptions(agentOptions);
    
    if (!proxyUri) {
      throw new Error('Proxy URI is required for SOCKS proxy agent');
    }
    
    return this.createTimelineEnabledAgent(
      SocksProxyAgent,
      tlsOptions,
      timeline,
      proxyUri
    );
  }

  /**
   * Creates TLS options with secure defaults
   */
  private static createTLSOptions(agentOptions: T_HttpsAgentRequestFields): T_HttpsAgentRequestFields {
    return {
      ...agentOptions,
      secureProtocol: undefined, // Let Node.js choose
      minVersion: 'TLSv1.2',
      maxVersion: 'TLSv1.3',
      rejectUnauthorized: agentOptions.rejectUnauthorized ?? true,
      keepAlive: true,
      keepAliveMsecs: 30000,
      ALPNProtocols: ['http/1.1']
    };
  }

  /**
   * Creates an agent wrapper that adds timeline logging via socket interception
   */
  private static createTimelineEnabledAgent(
    AgentClass: any,
    agentOptions: any,
    timeline: T_LoggerInstance,
    proxyUri?: string
  ): any {
    const agent = proxyUri 
      ? new AgentClass(proxyUri, agentOptions)
      : new AgentClass(agentOptions);

    // Store the original createConnection method
    const originalCreateConnection = agent.createConnection?.bind(agent);
    
    if (!originalCreateConnection) {
      return agent;
    }

    // Override createConnection to add timeline logging
    agent.createConnection = function(options: T_SocketConnectionOptions, callback: Function) {
      const { host, port } = options;
      
      this.logCAInfo(agentOptions, timeline);

      // Create the actual socket connection
      let socket: any;
      try {
        socket = originalCreateConnection(options, callback);
      } catch (error: unknown) {
        const err = error as Error;
        timeline.add('error', `Error creating connection: ${err.message}`);
        throw err;
      }
      
      if (!socket) {
        return socket;
      }

      // Set up socket event logging
      const eventHandler = new SocketEventHandler({
        socket,
        timeline,
        host,
        port
      });
      
      eventHandler.setupEventListeners();
      return socket;
    };

    // Bind the logCAInfo method
    agent.logCAInfo = this.logCAInfo;

    return agent;
  }

  /**
   * Logs CA certificate information
   */
  private static logCAInfo(agentOptions: any, timeline: T_LoggerInstance): void {
    if (agentOptions.ca) {
      timeline.add('tls', ' CAfile: [custom certificates provided]');
    } else {
      timeline.add('tls', ' CAfile: [system default]');
    }
    timeline.add('tls', ' CApath: none');
  }
} 