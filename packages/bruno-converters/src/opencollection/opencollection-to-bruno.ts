import { OpenCollection } from "@opencollection/types";
import { BrunoCollection, BrunoCollectionRoot, BrunoConfig, PemCertificate, Pkcs12Certificate } from "./types";
import { fromOpenCollectionAuth, fromOpenCollectionHeaders, fromOpenCollectionScripts, fromOpenCollectionVariables } from "./common";
import { uuid } from "../common";
import { fromOpenCollectionItems } from "./items";
import { fromOpenCollectionFolder } from "./folder";
import { fromOpenCollectionEnvironments } from "./environment";

const fromOpenCollectionConfig = (oc: OpenCollection): BrunoConfig => {
  const brunoExtension = oc.extensions?.bruno as {
    ignore?: string[];
    presets?: {
      requestType?: string;
      requestUrl?: string;
    };
  } | undefined;

  const ignoreList = brunoExtension && Array.isArray(brunoExtension.ignore)
    ? brunoExtension.ignore
    : ['node_modules', '.git'];

  const brunoConfig: BrunoConfig = {
    version: '1',
    name: oc.info?.name || 'Untitled Collection',
    type: 'collection',
    ignore: ignoreList
  };

  if (brunoExtension?.presets?.requestType || brunoExtension?.presets?.requestUrl) {
    brunoConfig.presets = {};
    if (brunoExtension.presets.requestType) {
      brunoConfig.presets.requestType = brunoExtension.presets.requestType;
    }
    if (brunoExtension.presets.requestUrl) {
      brunoConfig.presets.requestUrl = brunoExtension.presets.requestUrl;
    }
  }

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
        enabled: p.disabled !== true
      }))
    };
  }

  if (config.proxy) {
    brunoConfig.proxy = {
      disabled: config.proxy.disabled,
      inherit: config.proxy.inherit,
      config: config.proxy.config
    };
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
      script: scripts?.script,
      vars: fromOpenCollectionVariables(oc.request.variables),
      tests: scripts?.tests
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

export const openCollectionToBruno = (openCollection: OpenCollection): BrunoCollection => {
  const brunoCollection: BrunoCollection = {
    uid: uuid(),
    name: openCollection.info?.name || 'Untitled Collection',
    version: '1',
    items: fromOpenCollectionItems(openCollection.items, (folder: unknown) => fromOpenCollectionFolder(folder as Parameters<typeof fromOpenCollectionFolder>[0])),
    environments: fromOpenCollectionEnvironments(openCollection.config?.environments),
    brunoConfig: fromOpenCollectionConfig(openCollection) as Record<string, unknown>,
    root: fromOpenCollectionRoot(openCollection)
  };

  return brunoCollection;
};