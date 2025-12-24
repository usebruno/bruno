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
import type {
  Folder,
  FolderInfo,
  RequestDefaults,
  Auth,
  BrunoItem,
  BrunoFolderRoot,
  BrunoKeyValue
} from './types';

export const fromOpenCollectionFolder = (folder: Folder): BrunoItem => {
  const info = folder.info || {};

  const brunoFolder: BrunoItem = {
    uid: uuid(),
    type: 'folder',
    name: info.name || 'Untitled Folder',
    seq: info.seq || 1
  };

  if (folder.request || folder.docs) {
    const root: BrunoFolderRoot = {};

    if (folder.request) {
      const scripts = fromOpenCollectionScripts(folder.request.scripts);
      root.request = {
        headers: fromOpenCollectionHeaders(folder.request.headers),
        auth: fromOpenCollectionAuth(folder.request.auth as Auth),
        script: scripts?.script,
        vars: fromOpenCollectionVariables(folder.request.variables),
        tests: scripts?.tests
      };
    }

    if (folder.docs) {
      if (typeof folder.docs === 'string') {
        root.docs = folder.docs;
      } else if (folder.docs && typeof folder.docs === 'object' && 'content' in folder.docs) {
        root.docs = folder.docs.content || '';
      }
    }

    root.meta = {
      name: info.name || 'Untitled Folder',
      seq: info.seq || 1
    };

    brunoFolder.root = root;
  }

  if (info.tags?.length) {
    brunoFolder.tags = info.tags;
  }

  if (folder.items?.length) {
    brunoFolder.items = fromOpenCollectionItems(folder.items, fromOpenCollectionFolder as (f: unknown) => BrunoItem);
  }

  return brunoFolder;
};

export const toOpenCollectionFolder = (folder: BrunoItem): Folder => {
  const info: FolderInfo = {
    name: folder.name || 'Untitled Folder',
    type: 'folder'
  };

  if (folder.seq) {
    info.seq = folder.seq;
  }

  if (folder.tags?.length) {
    info.tags = folder.tags;
  }

  const ocFolder: Folder = {
    info
  };

  if (folder.root) {
    const folderRequest = folder.root.request || {};

    const headers = toOpenCollectionHeaders(folderRequest.headers as BrunoKeyValue[]);
    const auth = toOpenCollectionAuth(folderRequest.auth);
    const scripts = toOpenCollectionScripts(folderRequest as { script?: { req: string | null; res: string | null } | null; tests?: string | null });
    const variables = toOpenCollectionVariables(folderRequest.vars);

    if (headers || auth || scripts || variables) {
      const request: RequestDefaults = {};

      if (headers) {
        request.headers = headers;
      }

      if (auth) {
        request.auth = auth;
      }

      if (scripts) {
        request.scripts = scripts;
      }

      if (variables) {
        request.variables = variables;
      }

      ocFolder.request = request;
    }

    if (folder.root.docs) {
      ocFolder.docs = {
        content: folder.root.docs,
        type: 'text/markdown'
      };
    }
  }

  if (folder.items?.length) {
    ocFolder.items = toOpenCollectionItems(folder.items, toOpenCollectionFolder as (f: BrunoItem) => unknown) as Folder['items'];
  }

  return ocFolder;
};
