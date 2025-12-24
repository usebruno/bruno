import { toOpenCollectionAuth, toOpenCollectionHeaders, toOpenCollectionScripts, toOpenCollectionVariables } from "./common";
import { toOpenCollectionEnvironments } from "./environment";
import { toOpenCollectionFolder } from "./folder";
import { toOpenCollectionItems } from "./items";
import { BrunoCollection, BrunoCollectionRoot, BrunoConfig, ClientCertificate, CollectionConfig, OpenCollection, PemCertificate, Pkcs12Certificate, Protobuf } from "./types";

const toOpenCollectionConfig = (brunoConfig: BrunoConfig | undefined): CollectionConfig | undefined => {
  if (!brunoConfig) {
    return undefined;
  }

  const config: CollectionConfig = {};

  if (brunoConfig.protobuf?.protoFiles?.length || brunoConfig.protobuf?.importPaths?.length) {
    config.protobuf = {} as Protobuf;

    if (brunoConfig.protobuf.protoFiles?.length) {
      config.protobuf.protoFiles = brunoConfig.protobuf.protoFiles.map((f) => ({
        type: 'file' as const,
        path: f.path
      }));
    }

    if (brunoConfig.protobuf.importPaths?.length) {
      config.protobuf.importPaths = brunoConfig.protobuf.importPaths.map((p) => {
        const importPath: { path: string; disabled?: boolean } = { path: p.path };
        if (p.disabled) {
          importPath.disabled = true;
        }
        return importPath;
      });
    }
  }

  if (brunoConfig.proxy?.enabled) {
    if (brunoConfig.proxy.enabled === 'global') {
      config.proxy = 'inherit';
    } else {
      config.proxy = {
        protocol: brunoConfig.proxy.protocol || 'http',
        hostname: brunoConfig.proxy.hostname || '',
        port: brunoConfig.proxy.port || 0
      };

      if (brunoConfig.proxy.auth?.enabled) {
        config.proxy.auth = {
          username: brunoConfig.proxy.auth.username || '',
          password: brunoConfig.proxy.auth.password || ''
        };
      }

      if (brunoConfig.proxy.bypassProxy) {
        config.proxy.bypassProxy = brunoConfig.proxy.bypassProxy;
      }
    }
  }

  if (brunoConfig.clientCertificates?.certs?.length) {
    config.clientCertificates = brunoConfig.clientCertificates.certs
      .map((cert): ClientCertificate | null => {
        if (cert.type === 'pem') {
          const pemCert: PemCertificate = {
            domain: cert.domain || '',
            type: 'pem',
            certificateFilePath: cert.certFilePath || '',
            privateKeyFilePath: cert.keyFilePath || ''
          };
          if (cert.passphrase) {
            pemCert.passphrase = cert.passphrase;
          }
          return pemCert;
        } else if (cert.type === 'pkcs12') {
          const pkcs12Cert: Pkcs12Certificate = {
            domain: cert.domain || '',
            type: 'pkcs12',
            pkcs12FilePath: cert.pfxFilePath || ''
          };
          if (cert.passphrase) {
            pkcs12Cert.passphrase = cert.passphrase;
          }
          return pkcs12Cert;
        }
        return null;
      })
      .filter((cert): cert is ClientCertificate => cert !== null);
  }

  return Object.keys(config).length > 0 ? config : undefined;
};

const hasRequestDefaults = (root: BrunoCollectionRoot | undefined): boolean => {
  const request = root?.request;
  return Boolean(
    request?.headers?.length ||
    request?.vars?.req?.length ||
    request?.script?.req ||
    request?.script?.res ||
    request?.tests ||
    (request?.auth && request.auth.mode !== 'none')
  );
};

export const brunoToOpenCollection = (collection: BrunoCollection): OpenCollection => {
  const openCollection: OpenCollection = {
    opencollection: '1.0.0',
    info: {
      name: collection.name || 'Untitled Collection'
    }
  };

  const config = toOpenCollectionConfig(collection.brunoConfig as BrunoConfig);
  if (config) {
    openCollection.config = config;
  }

  const environments = toOpenCollectionEnvironments(collection.environments ?? undefined);
  if (environments?.length) {
    if (!openCollection.config) {
      openCollection.config = {};
    }
    openCollection.config.environments = environments;
  }

  const items = toOpenCollectionItems(collection.items, toOpenCollectionFolder);
  if (items.length) {
    openCollection.items = items as OpenCollection['items'];
  }

  if (hasRequestDefaults(collection.root as BrunoCollectionRoot)) {
    const request = (collection.root as BrunoCollectionRoot)?.request;
    openCollection.request = {};

    const headers = toOpenCollectionHeaders(request?.headers);
    if (headers) {
      openCollection.request.headers = headers;
    }

    const auth = toOpenCollectionAuth(request?.auth);
    if (auth) {
      openCollection.request.auth = auth;
    }

    const variables = toOpenCollectionVariables(request?.vars);
    if (variables) {
      openCollection.request.variables = variables;
    }

    const scripts = toOpenCollectionScripts(request as any);
    if (scripts) {
      openCollection.request.scripts = scripts;
    }
  }

  if ((collection.root as BrunoCollectionRoot)?.docs) {
    openCollection.docs = {
      content: (collection.root as BrunoCollectionRoot).docs!,
      type: 'text/markdown'
    };
  }

  openCollection.bundled = true;

  const extensions: { ignore?: string[] } = {};
  if ((collection.brunoConfig as BrunoConfig)?.ignore?.length) {
    extensions.ignore = (collection.brunoConfig as BrunoConfig).ignore;
  }
  if (Object.keys(extensions).length > 0) {
    openCollection.extensions = extensions;
  }

  return openCollection;
};