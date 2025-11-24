import type { OpenCollection } from '@opencollection/types';
import type { ProtoFileItem, ProtoFileImportPath } from '@opencollection/types/config/protobuf';
import type { HttpHeader } from '@opencollection/types/requests/http';
import type { ClientCertificate, PemCertificate, Pkcs12Certificate } from '@opencollection/types/config/certificates';
import type { Variable } from '@opencollection/types/common/variables';
import type { Scripts } from '@opencollection/types/common/scripts';
import { stringifyYml } from './utils';
import { toOpenCollectionAuth } from './common/auth';
import { toOpenCollectionHttpHeaders } from './common/headers';
import { toOpenCollectionVariables } from './common/variables';
import { toOpenCollectionScripts } from './common/scripts';
import type { Auth } from '@opencollection/types/common/auth';

const hasCollectionConfig = (brunoConfig: any): boolean => {
  // protobuf
  const hasProtobuf = (
    brunoConfig.protobuf?.protofFiles?.length > 0
    || brunoConfig.protobuf?.importPaths?.length > 0
  );

  // proxy
  const hasProxy = !!brunoConfig.proxy?.enabled;

  // client certificates
  const hasClientCertificates = brunoConfig.clientCertificates?.certs?.length > 0;

  return hasProtobuf || hasProxy || hasClientCertificates;
};

const hasRequestDefaults = (collectionRoot: any): boolean => {
  const requestRoot = collectionRoot?.request;

  return Boolean((requestRoot?.headers?.length)
    || (requestRoot?.vars?.req?.length)
    || hasRequestScripts(collectionRoot)
    || hasRequestAuth(collectionRoot));
};

const hasRequestAuth = (collectionRoot: any): boolean => {
  return Boolean((collectionRoot.request?.auth?.mode !== 'none'));
};

const hasRequestScripts = (collectionRoot: any): boolean => {
  return (collectionRoot.request?.script?.req)
    || (collectionRoot.request?.script?.res)
    || (collectionRoot.request?.tests);
};

const stringifyCollection = (collectionRoot: any, brunoConfig: any): string => {
  try {
    const oc: OpenCollection = {};

    oc.info = {
      name: brunoConfig.name || 'Untitled Collection'
    };
    oc.opencollection = '1.0.0';

    // collection config
    if (hasCollectionConfig(brunoConfig)) {
      oc.config = {};

      if (brunoConfig.protobuf?.protofFiles?.length) {
        oc.config.protobuf = {
          protoFiles: brunoConfig.protobuf.protofFiles.map((protoFile: any): ProtoFileItem => ({
            type: 'file' as const,
            path: protoFile.path
          })),
          importPaths: brunoConfig.protobuf.importPaths.map((importPath: any): ProtoFileImportPath => ({
            path: importPath.path,
            disabled: importPath.disabled
          }))
        };
      }

      // proxy
      if (brunoConfig.proxy?.enabled) {
        if (brunoConfig.proxy.enabled === 'global') {
          oc.config.proxy = 'inherit';
        } else {
          oc.config.proxy = {
            protocol: brunoConfig.proxy.protocol,
            hostname: brunoConfig.proxy.hostname,
            port: brunoConfig.proxy.port
          };

          if (brunoConfig.proxy.auth?.enabled) {
            oc.config.proxy.auth = {
              username: brunoConfig.proxy.auth.username,
              password: brunoConfig.proxy.auth.password
            };
          }
        }
      }

      // client certificates
      if (brunoConfig.clientCertificates?.certs?.length) {
        oc.config.clientCertificates = brunoConfig.clientCertificates.certs
          .map((cert: any): ClientCertificate | null => {
            if (cert.type === 'pem') {
              const pemCert: PemCertificate = {
                domain: cert.domain,
                type: 'pem',
                certificateFilePath: cert.certFilePath,
                privateKeyFilePath: cert.keyFilePath,
                ...(cert.passphrase && { passphrase: cert.passphrase })
              };
              return pemCert;
            } else if (cert.type === 'pkcs12') {
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
        const ocHeaders: HttpHeader[] | undefined = toOpenCollectionHttpHeaders(collectionRoot.request?.headers);
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

      // scripts
      if (hasRequestScripts(collectionRoot)) {
        const ocScripts: Scripts | undefined = toOpenCollectionScripts(collectionRoot.request);
        if (ocScripts) {
          oc.request.scripts = ocScripts;
        }
      }
    }

    // docs
    if (collectionRoot.docs?.trim().length) {
      oc.docs = {
        content: collectionRoot.docs,
        type: 'text/markdown'
      };
    }

    // bundled
    oc.bundled = false;

    // extensions
    oc.extensions = {};
    if (brunoConfig.ignore?.length) {
      const ignoreList: string[] = [];
      brunoConfig.ignore.forEach((ignore: string) => {
        ignoreList.push(ignore);
      });
      oc.extensions.ignore = ignoreList;
    }

    return stringifyYml(oc);
  } catch (error) {
    console.error('Error stringifying opencollection.yml:', error);
    throw error;
  }
};

export default stringifyCollection;
