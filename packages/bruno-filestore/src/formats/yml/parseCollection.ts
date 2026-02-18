import type { OpenCollection } from '@opencollection/types';
import type { FolderRoot } from '@usebruno/schema-types/collection/folder';
import { parseYml } from './utils';
import { toBrunoAuth } from './common/auth';
import { toBrunoHttpHeaders } from './common/headers';
import { toBrunoVariables } from './common/variables';
import { toBrunoPostResponseVariables } from './common/actions';
import { toBrunoScripts } from './common/scripts';
import { ensureString } from '../../utils';

interface ParsedCollection {
  collectionRoot: FolderRoot;
  brunoConfig: Record<string, any>;
}

const parseCollection = (ymlString: string): ParsedCollection => {
  try {
    const oc: OpenCollection = parseYml(ymlString);

    // bruno config
    const brunoConfig: Record<string, any> = {
      opencollection: oc.opencollection || '1.0.0',
      name: ensureString(oc.info?.name, 'Untitled Collection'),
      type: 'collection',
      ignore: []
    };

    const brunoExtension = (oc.extensions as any)?.bruno;
    if (brunoExtension?.ignore && Array.isArray(brunoExtension.ignore)) {
      brunoConfig.ignore = brunoExtension.ignore;
    }

    // presets
    if (brunoExtension?.presets) {
      const presets = brunoExtension.presets as any;
      if (presets.request) {
        brunoConfig.presets = {
          requestType: presets.request.type || [],
          requestUrl: presets.request.url || []
        };
      }
    }

    // bruno-specific extensions
    const brunoExtensions = oc.extensions?.bruno as any;
    if (Array.isArray(brunoExtensions?.scripts?.additionalContextRoots)) {
      const sanitizedRoots = brunoExtensions.scripts.additionalContextRoots
        .filter((item: any) => typeof item === 'string');

      if (sanitizedRoots.length > 0) {
        brunoConfig.scripts = {
          ...brunoConfig.scripts,
          additionalContextRoots: sanitizedRoots
        };
      }
    }
    if (brunoExtensions?.openapi?.sync) {
      brunoConfig.openapi = {
        sync: {
          sourceUrl: brunoExtensions.openapi.sync.sourceUrl,
          groupBy: brunoExtensions.openapi.sync.groupBy,
          specFilename: brunoExtensions.openapi.sync.specFilename,
          ...(brunoExtensions.openapi.sync.lastSyncDate && { lastSyncDate: brunoExtensions.openapi.sync.lastSyncDate }),
          ...(brunoExtensions.openapi.sync.specHash && { specHash: brunoExtensions.openapi.sync.specHash })
        }
      };
    }

    // protobuf
    if (oc.config?.protobuf) {
      brunoConfig.protobuf = {
        protoFiles: oc.config.protobuf.protoFiles?.map((protoFile: any) => ({
          path: protoFile.path
        })) || [],
        importPaths: oc.config.protobuf.importPaths?.map((importPath: any) => ({
          path: importPath.path,
          enabled: importPath.disabled !== true
        })) || []
      };
    }

    // proxy - only support newer format
    // Default: inherit from global preferences
    brunoConfig.proxy = {
      inherit: true,
      config: {
        protocol: 'http',
        hostname: '',
        port: '',
        auth: {
          username: '',
          password: ''
        },
        bypassProxy: ''
      }
    };

    if (oc.config?.proxy && typeof oc.config.proxy === 'object') {
      // Validate newer format: must have 'inherit' and 'config' properties
      const proxyConfig = oc.config.proxy as any;

      if ('inherit' in proxyConfig && typeof proxyConfig.inherit === 'boolean' && proxyConfig.config && typeof proxyConfig.config === 'object') {
        // Valid newer format
        brunoConfig.proxy = {
          inherit: proxyConfig.inherit,
          config: {
            protocol: proxyConfig.config.protocol || 'http',
            hostname: proxyConfig.config.hostname || '',
            port: proxyConfig.config.port || '',
            auth: {
              username: proxyConfig.config.auth?.username || '',
              password: proxyConfig.config.auth?.password || ''
            },
            bypassProxy: proxyConfig.config.bypassProxy || ''
          }
        };

        // Handle optional disabled field
        if (proxyConfig.disabled === true) {
          brunoConfig.proxy.disabled = true;
        }

        // Handle optional auth.disabled field
        if (proxyConfig.config.auth?.disabled === true) {
          brunoConfig.proxy.config.auth.disabled = true;
        }
      }
      // If not in newer format, use default (inherit: true)
    }

    // client certificates
    if (oc.config?.clientCertificates?.length) {
      brunoConfig.clientCertificates = {
        certs: oc.config.clientCertificates.map((cert: any) => {
          if (cert.type === 'pem') {
            return {
              domain: cert.domain,
              type: 'cert',
              certFilePath: cert.certificateFilePath,
              keyFilePath: cert.privateKeyFilePath,
              passphrase: cert.passphrase || ''
            };
          } else if (cert.type === 'pkcs12') {
            return {
              domain: cert.domain,
              type: 'pfx',
              pfxFilePath: cert.pkcs12FilePath,
              passphrase: cert.passphrase || ''
            };
          }
          return null;
        }).filter((cert: any) => cert !== null)
      };
    }

    // collection root
    const collectionRoot: FolderRoot = {
      meta: null,
      request: null,
      docs: null
    };

    // request defaults
    if (oc.request) {
      collectionRoot.request = {
        headers: null,
        auth: null,
        script: {
          req: null,
          res: null
        },
        vars: {
          req: [],
          res: []
        },
        tests: null
      };

      // headers
      const headers = toBrunoHttpHeaders(oc.request.headers);
      collectionRoot.request.headers = headers || [];

      // auth
      const auth = toBrunoAuth(oc.request.auth);
      if (auth) {
        collectionRoot.request.auth = auth;
      }

      // variables
      const variables = toBrunoVariables(oc.request.variables);
      const postResponseVars = toBrunoPostResponseVariables((oc.request as any).actions);
      collectionRoot.request.vars = {
        req: variables.req,
        res: postResponseVars
      };

      // scripts
      const scripts = toBrunoScripts(oc.request.scripts);
      if (scripts?.script && collectionRoot.request.script) {
        if (scripts.script.req) {
          collectionRoot.request.script.req = scripts.script.req;
        }
        if (scripts.script.res) {
          collectionRoot.request.script.res = scripts.script.res;
        }
      }
      if (scripts?.tests) {
        collectionRoot.request.tests = scripts.tests;
      }
    }

    // docs
    if (oc.docs) {
      if (typeof oc.docs === 'string') {
        collectionRoot.docs = oc.docs;
      } else if (typeof oc.docs === 'object' && oc.docs.content) {
        collectionRoot.docs = oc.docs.content;
      }
    }

    return {
      collectionRoot,
      brunoConfig
    };
  } catch (error) {
    console.error('Error parsing collection:', error);
    throw error;
  }
};

export default parseCollection;
