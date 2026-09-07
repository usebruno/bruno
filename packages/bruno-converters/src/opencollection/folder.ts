import { uuid } from '../common/index.js';
import {
  fromOpenCollectionHeaders,
  toOpenCollectionHeaders,
  fromOpenCollectionAuth,
  toOpenCollectionAuth,
  fromOpenCollectionScripts,
  toOpenCollectionScripts,
  fromOpenCollectionVariables,
  fromOpenCollectionActions,
  toOpenCollectionVariables,
  toOpenCollectionActions
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
import { HTTP_SCRIPT_KEYS } from '@usebruno/common';

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
      // TODO: Widen scope to include GRPC scripts once Collection/Folder level inheritance is added to GRPC.
      const scripts = fromOpenCollectionScripts(folder.request.scripts, HTTP_SCRIPT_KEYS);
      root.request = {
        headers: fromOpenCollectionHeaders(folder.request.headers),
        auth: fromOpenCollectionAuth(folder.request.auth as Auth),
        script: scripts?.script,
        vars: {
          ...fromOpenCollectionVariables(folder.request.variables),
          res: fromOpenCollectionActions(folder.request.actions)
        },
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
    // TODO: Widen scope to include GRPC scripts once Collection/Folder level inheritance is added to GRPC.
    const scripts = toOpenCollectionScripts(folderRequest as { script?: { req: string | null; res: string | null } | null; tests?: string | null }, HTTP_SCRIPT_KEYS);
    const variables = toOpenCollectionVariables(folderRequest.vars);
    const actions = toOpenCollectionActions(folderRequest.vars?.res);

    if (headers || auth || scripts || variables || actions) {
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

      if (actions) {
        request.actions = actions;
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
