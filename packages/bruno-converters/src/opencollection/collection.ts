import { uuid } from '../common/index.js';
import {
  fromOpenCollectionHeaders,
  toOpenCollectionHeaders,
  fromOpenCollectionAuth,
  toOpenCollectionAuth,
  fromOpenCollectionScripts,
  toOpenCollectionScripts,
  fromOpenCollectionVariables,
  toOpenCollectionVariables
} from './common';
import { fromOpenCollectionItems, toOpenCollectionItems } from './items';
import { fromOpenCollectionFolder, toOpenCollectionFolder } from './folder';
import { fromOpenCollectionEnvironments, toOpenCollectionEnvironments } from './environment';
import type {
  OpenCollection,
  CollectionConfig,
  Protobuf,
  ClientCertificate,
  PemCertificate,
  Pkcs12Certificate,
  BrunoCollection
} from './types';

interface BrunoConfig {
  version?: string;
  name?: string;
  type?: string;
  ignore?: string[];
  protobuf?: {
    protoFiles?: { path: string }[];
    importPaths?: { path: string; disabled?: boolean }[];
  };
  proxy?: {
    enabled?: boolean | 'global';
    protocol?: string;
    hostname?: string;
    port?: number;
    auth?: {
      enabled?: boolean;
      username?: string;
      password?: string;
    };
    bypassProxy?: string;
  };
  clientCertificates?: {
    certs?: Array<{
      domain?: string;
      type?: 'pem' | 'pkcs12';
      certFilePath?: string;
      keyFilePath?: string;
      pfxFilePath?: string;
      passphrase?: string;
    }>;
  };
}

interface BrunoCollectionRoot {
  request?: any;
  docs?: string;
  meta?: {
    name?: string;
    seq?: number;
  };
}

const fromOpenCollectionConfig = (oc: OpenCollection): BrunoConfig => {
  const extensions = oc.extensions as Record<string, unknown> | undefined;
  const ignoreList = Array.isArray(extensions?.ignore)
    ? extensions.ignore as string[]
    : ['node_modules', '.git'];

  const brunoConfig: BrunoConfig = {
    version: '1',
    name: oc.info?.name || 'Untitled Collection',
    type: 'collection',
    ignore: ignoreList
  };

  const config = oc.config;
  if (!config) {
    return brunoConfig;
  }

  if (config.protobuf) {
    brunoConfig.protobuf = {
      protoFiles: config.protobuf.protoFiles?.map((f) => ({
        path: f.path
      })),
      importPaths: config.protobuf.importPaths?.map((p) => ({
        path: p.path,
        disabled: p.disabled || false
      }))
    };
  }

  if (config.proxy && typeof config.proxy !== 'boolean') {
    if (config.proxy === 'inherit') {
      brunoConfig.proxy = { enabled: 'global' };
    } else {
      const proxyConfig = config.proxy;
      brunoConfig.proxy = {
        enabled: true,
        protocol: proxyConfig.protocol || 'http',
        hostname: proxyConfig.hostname || '',
        port: proxyConfig.port || 0
      };

      if (proxyConfig.auth) {
        brunoConfig.proxy.auth = {
          enabled: true,
          username: proxyConfig.auth.username || '',
          password: proxyConfig.auth.password || ''
        };
      }

      if (proxyConfig.bypassProxy) {
        brunoConfig.proxy.bypassProxy = proxyConfig.bypassProxy;
      }
    }
  }

  if (config.clientCertificates?.length) {
    brunoConfig.clientCertificates = {
      certs: config.clientCertificates.map((cert) => {
        if (cert.type === 'pem') {
          const pemCert = cert as PemCertificate;
          return {
            domain: pemCert.domain || '',
            type: 'pem' as const,
            certFilePath: pemCert.certificateFilePath || '',
            keyFilePath: pemCert.privateKeyFilePath || '',
            passphrase: pemCert.passphrase || ''
          };
        } else if (cert.type === 'pkcs12') {
          const pkcs12Cert = cert as Pkcs12Certificate;
          return {
            domain: pkcs12Cert.domain || '',
            type: 'pkcs12' as const,
            pfxFilePath: pkcs12Cert.pkcs12FilePath || '',
            passphrase: pkcs12Cert.passphrase || ''
          };
        }
        return null;
      }).filter((cert): cert is NonNullable<typeof cert> => cert !== null)
    };
  }

  return brunoConfig;
};

const fromOpenCollectionRoot = (oc: OpenCollection): BrunoCollectionRoot => {
  const root: BrunoCollectionRoot = {};

  if (oc.request) {
    const scripts = fromOpenCollectionScripts(oc.request.scripts);
    root.request = {
      headers: fromOpenCollectionHeaders(oc.request.headers),
      auth: fromOpenCollectionAuth(oc.request.auth),
      script: scripts.script,
      vars: fromOpenCollectionVariables(oc.request.variables),
      tests: scripts.tests
    };
  }

  if (oc.docs) {
    root.docs = typeof oc.docs === 'string'
      ? oc.docs
      : oc.docs.content || '';
  }

  root.meta = {
    name: oc.info?.name || 'Untitled Collection'
  };

  return root;
};

export const fromOpenCollection = (openCollection: OpenCollection): BrunoCollection => {
  const brunoCollection: BrunoCollection = {
    uid: uuid(),
    name: openCollection.info?.name || 'Untitled Collection',
    version: '1',
    items: fromOpenCollectionItems(openCollection.items, fromOpenCollectionFolder),
    environments: fromOpenCollectionEnvironments(openCollection.config?.environments),
    brunoConfig: fromOpenCollectionConfig(openCollection) as Record<string, unknown>,
    root: fromOpenCollectionRoot(openCollection)
  };

  return brunoCollection;
};

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

export const toOpenCollection = (collection: BrunoCollection): OpenCollection => {
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
    openCollection.items = items;
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
