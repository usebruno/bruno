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
  Item,
  BrunoItem,
  BrunoFolderRoot
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
        auth: fromOpenCollectionAuth(folder.request.auth),
        script: scripts.script,
        vars: fromOpenCollectionVariables(folder.request.variables),
        tests: scripts.tests
      };
    }

    if (folder.docs) {
      root.docs = typeof folder.docs === 'string'
        ? folder.docs
        : folder.docs.content || '';
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
    brunoFolder.items = fromOpenCollectionItems(folder.items as Item[], fromOpenCollectionFolder);
  }

  return brunoFolder;
};

export const toOpenCollectionFolder = (folder: BrunoItem): Folder => {
  const ocFolder: Folder = {
    info: {
      name: folder.name || 'Untitled Folder',
      type: 'folder'
    }
  };

  if (folder.seq) {
    ocFolder.info!.seq = folder.seq;
  }

  if (folder.tags?.length) {
    ocFolder.info!.tags = folder.tags;
  }

  if (folder.root) {
    const folderRequest = folder.root.request || {};

    const headers = toOpenCollectionHeaders(folderRequest.headers);
    const auth = toOpenCollectionAuth(folderRequest.auth);
    const scripts = toOpenCollectionScripts(folderRequest as any);
    const variables = toOpenCollectionVariables(folderRequest.vars);

    if (headers || auth || scripts || variables) {
      ocFolder.request = {};

      if (headers) {
        ocFolder.request.headers = headers;
      }

      if (auth) {
        ocFolder.request.auth = auth;
      }

      if (scripts) {
        ocFolder.request.scripts = scripts;
      }

      if (variables) {
        ocFolder.request.variables = variables;
      }
    }

    if (folder.root.docs) {
      ocFolder.docs = {
        content: folder.root.docs,
        type: 'text/markdown'
      };
    }
  }

  if (folder.items?.length) {
    ocFolder.items = toOpenCollectionItems(folder.items, toOpenCollectionFolder) as Item[];
  }

  return ocFolder;
};
