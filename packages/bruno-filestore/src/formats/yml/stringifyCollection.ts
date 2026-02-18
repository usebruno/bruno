import type { OpenCollection } from '@opencollection/types';
import type { ProtoFileItem, ProtoFileImportPath } from '@opencollection/types/config/protobuf';
import type { HttpRequestHeader } from '@opencollection/types/requests/http';
import type { ClientCertificate, PemCertificate, Pkcs12Certificate } from '@opencollection/types/config/certificates';
import type { Variable } from '@opencollection/types/common/variables';
import type { Action } from '@opencollection/types/common/actions';
import type { Scripts } from '@opencollection/types/common/scripts';
import { stringifyYml } from './utils';
import { toOpenCollectionAuth } from './common/auth';
import { toOpenCollectionHttpHeaders } from './common/headers';
import { toOpenCollectionVariables } from './common/variables';
import { toOpenCollectionActions } from './common/actions';
import { toOpenCollectionScripts } from './common/scripts';
import type { Auth } from '@opencollection/types/common/auth';

const hasCollectionConfig = (brunoConfig: any): boolean => {
  // protobuf
  const hasProtobuf = (
    brunoConfig.protobuf?.protoFiles?.length > 0
    || brunoConfig.protobuf?.importPaths?.length > 0
  );

  // proxy - check if proxy is configured in newer format
  // Valid newer format: has 'inherit' property and 'config' object
  const isValidProxyFormat = brunoConfig.proxy
    && typeof brunoConfig.proxy === 'object'
    && 'inherit' in brunoConfig.proxy
    && brunoConfig.proxy.config
    && typeof brunoConfig.proxy.config === 'object';

  const hasProxy = isValidProxyFormat;

  // client certificates
  const hasClientCertificates = brunoConfig.clientCertificates?.certs?.length > 0;

  return hasProtobuf || hasProxy || hasClientCertificates;
};

const hasRequestDefaults = (collectionRoot: any): boolean => {
  const requestRoot = collectionRoot?.request;

  return Boolean((requestRoot?.headers?.length)
    || (requestRoot?.vars?.req?.length)
    || (requestRoot?.vars?.res?.length)
    || hasRequestScripts(collectionRoot)
    || hasRequestAuth(collectionRoot));
};

const hasRequestAuth = (collectionRoot: any): boolean => {
  const reqAuthMode = collectionRoot?.request?.auth?.mode;
  return Boolean(reqAuthMode && reqAuthMode !== 'none');
};

const hasRequestScripts = (collectionRoot: any): boolean => {
  if (!collectionRoot?.request) return false;

  return (collectionRoot.request.script?.req)
    || (collectionRoot.request.script?.res)
    || (collectionRoot.request.tests);
};

const hasPresets = (brunoConfig: any): boolean => {
  return brunoConfig?.presets?.requestType?.length
    || brunoConfig?.presets?.requestUrl?.length;
};

const stringifyCollection = (collectionRoot: any, brunoConfig: any): string => {
  try {
    const oc: OpenCollection = {};

    oc.opencollection = '1.0.0';
    oc.info = {
      name: brunoConfig.name || 'Untitled Collection'
    };

    // collection config
    if (hasCollectionConfig(brunoConfig)) {
      oc.config = {};

      if (brunoConfig.protobuf?.protoFiles?.length || brunoConfig.protobuf?.importPaths?.length) {
        oc.config.protobuf = {};

        if (brunoConfig.protobuf.protoFiles?.length) {
          oc.config.protobuf.protoFiles = brunoConfig.protobuf.protoFiles.map((protoFile: any): ProtoFileItem => ({
            type: 'file' as const,
            path: protoFile.path
          }));
        }

        if (brunoConfig.protobuf.importPaths?.length) {
          oc.config.protobuf.importPaths = brunoConfig.protobuf.importPaths.map((importPath: any): ProtoFileImportPath => {
            const item: ProtoFileImportPath = { path: importPath.path };
            if (importPath.enabled === false) {
              item.disabled = true;
            }
            return item;
          });
        }
      }

      // proxy - only write newer format
      // Validate that brunoConfig.proxy is in newer format before writing
      const isValidProxyFormat = brunoConfig.proxy
        && typeof brunoConfig.proxy === 'object'
        && 'inherit' in brunoConfig.proxy
        && brunoConfig.proxy.config
        && typeof brunoConfig.proxy.config === 'object';

      if (isValidProxyFormat) {
        oc.config.proxy = {
          inherit: brunoConfig.proxy.inherit,
          config: {
            protocol: brunoConfig.proxy.config.protocol || 'http',
            hostname: brunoConfig.proxy.config.hostname || '',
            port: brunoConfig.proxy.config.port || '',
            auth: {
              username: brunoConfig.proxy.config.auth?.username || '',
              password: brunoConfig.proxy.config.auth?.password || ''
            },
            bypassProxy: brunoConfig.proxy.config.bypassProxy || ''
          }
        };

        // Add optional disabled field if true
        if (brunoConfig.proxy.disabled === true) {
          oc.config.proxy.disabled = true;
        }

        // Add optional auth.disabled field if true
        if (brunoConfig.proxy.config?.auth?.disabled === true) {
          if (oc.config.proxy.config && oc.config.proxy.config.auth) {
            oc.config.proxy.config.auth.disabled = true;
          }
        }
      }

      // client certificates
      if (brunoConfig.clientCertificates?.certs?.length) {
        oc.config.clientCertificates = brunoConfig.clientCertificates.certs
          .map((cert: any): ClientCertificate | null => {
            if (cert.type === 'cert') {
              const pemCert: PemCertificate = {
                domain: cert.domain,
                type: 'pem',
                certificateFilePath: cert.certFilePath,
                privateKeyFilePath: cert.keyFilePath,
                ...(cert.passphrase && { passphrase: cert.passphrase })
              };
              return pemCert;
            } else if (cert.type === 'pfx') {
              const pkcs12Cert: Pkcs12Certificate = {
                domain: cert.domain,
                type: 'pkcs12',
                pkcs12FilePath: cert.pfxFilePath,
                ...(cert.passphrase && { passphrase: cert.passphrase })
              };
              return pkcs12Cert;
            } else {
              // Unsupported certificate type - ignore silently
              return null;
            }
          })
          .filter((cert: ClientCertificate | null): cert is ClientCertificate => cert !== null);
      }
    }

    // request defaults
    if (hasRequestDefaults(collectionRoot)) {
      oc.request = {};

      // headers
      if (collectionRoot.request?.headers?.length) {
        const ocHeaders: HttpRequestHeader[] | undefined = toOpenCollectionHttpHeaders(collectionRoot.request?.headers);
        if (ocHeaders) {
          oc.request.headers = ocHeaders;
        }
      }

      // auth
      if (hasRequestAuth(collectionRoot)) {
        const ocAuth: Auth | undefined = toOpenCollectionAuth(collectionRoot.request?.auth);
        if (ocAuth) {
          oc.request.auth = ocAuth;
        }
      }

      // variables
      if (collectionRoot.request?.vars?.req?.length) {
        const ocVariables: Variable[] | undefined = toOpenCollectionVariables(collectionRoot.request?.vars);
        if (ocVariables) {
          oc.request.variables = ocVariables;
        }
      }

      // actions (post-response variables)
      if (collectionRoot.request?.vars?.res?.length) {
        const ocActions: Action[] | undefined = toOpenCollectionActions(collectionRoot.request?.vars?.res);
        if (ocActions) {
          (oc.request as any).actions = ocActions;
        }
      }

      // scripts
      if (hasRequestScripts(collectionRoot)) {
        const ocScripts: Scripts | undefined = toOpenCollectionScripts(collectionRoot.request);
        if (ocScripts) {
          oc.request.scripts = ocScripts;
        }
      }
    }

    // docs
    if (collectionRoot?.docs?.trim().length) {
      oc.docs = {
        content: collectionRoot.docs,
        type: 'text/markdown'
      };
    }

    // bundled
    oc.bundled = false;

    // extensions
    oc.extensions = {};

    const hasBrunoExtensions = brunoConfig.ignore?.length || hasPresets(brunoConfig);

    if (hasBrunoExtensions) {
      const brunoExtension: any = {};

      if (brunoConfig.ignore?.length) {
        const ignoreList: string[] = [];
        brunoConfig.ignore.forEach((ignore: string) => {
          ignoreList.push(ignore);
        });
        brunoExtension.ignore = ignoreList;
      }

      if (hasPresets(brunoConfig)) {
        const presetsRequest: any = {};
        if (brunoConfig.presets.requestType?.length) {
          presetsRequest.type = brunoConfig.presets.requestType;
        }
        if (brunoConfig.presets.requestUrl?.length) {
          presetsRequest.url = brunoConfig.presets.requestUrl;
        }
        brunoExtension.presets = {
          request: presetsRequest
        };
      }

      oc.extensions.bruno = brunoExtension;
    }

    // bruno-specific script extensions
    if (brunoConfig.scripts?.additionalContextRoots?.length) {
      if (!oc.extensions.bruno) {
        oc.extensions.bruno = {};
      }
      (oc.extensions.bruno as any).scripts = {
        additionalContextRoots: brunoConfig.scripts.additionalContextRoots
      };
    }

    // bruno-specific extensions
    if (brunoConfig.openapi?.sync) {
      if (!oc.extensions.bruno) {
        oc.extensions.bruno = {};
      }
      (oc.extensions.bruno as any).openapi = {
        sync: {
          sourceUrl: brunoConfig.openapi.sync.sourceUrl,
          groupBy: brunoConfig.openapi.sync.groupBy,
          specFilename: brunoConfig.openapi.sync.specFilename,
          ...(brunoConfig.openapi.sync.lastSyncDate && { lastSyncDate: brunoConfig.openapi.sync.lastSyncDate }),
          ...(brunoConfig.openapi.sync.specHash && { specHash: brunoConfig.openapi.sync.specHash })
        }
      };
    }

    return stringifyYml(oc);
  } catch (error) {
    console.error('Error stringifying opencollection.yml:', error);
    throw error;
  }
};

export default stringifyCollection;
