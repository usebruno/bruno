import type { FolderRoot } from '@usebruno/schema-types/collection/folder';
import type { Folder } from '@opencollection/types/collection/item';
import type { Variable } from '@opencollection/types/common/variables';
import type { Scripts } from '@opencollection/types/common/scripts';
import type { Auth, HttpHeader } from '@opencollection/types/requests/http';
import type { RequestDefaults } from '@opencollection/types/common/request-defaults';
import { toOpenCollectionAuth } from './common/auth';
import { toOpenCollectionHttpHeaders } from './common/headers';
import { toOpenCollectionVariables } from './common/variables';
import { toOpenCollectionScripts } from './common/scripts';
import { stringifyYml } from './utils';

const hasRequestDefaults = (folderRoot: FolderRoot): boolean => {
  const requestDefaults = folderRoot?.request;

  return Boolean((requestDefaults?.headers?.length)
    || (requestDefaults?.vars?.req?.length)
    || hasRequestScripts(folderRoot)
    || hasRequestAuth(folderRoot));
};

const hasRequestAuth = (folderRoot: FolderRoot): boolean => {
  return Boolean((folderRoot.request?.auth?.mode !== 'none'));
};

const hasRequestScripts = (folderRoot: FolderRoot): boolean => {
  return Boolean((folderRoot.request?.script?.req)
    || (folderRoot.request?.script?.res)
    || (folderRoot.request?.tests));
};

const stringifyFolder = (folderRoot: FolderRoot): string => {
  try {
    const ocFolder: Folder = {
      type: 'folder'
    };

    ocFolder.name = folderRoot.meta?.name || 'Untitled Folder';
    ocFolder.seq = folderRoot.meta?.seq || 1;

    // request defaults
    if (hasRequestDefaults(folderRoot)) {
      ocFolder.request = {} as RequestDefaults;

      // headers
      if (folderRoot.request?.headers?.length) {
        const ocHeaders: HttpHeader[] | undefined = toOpenCollectionHttpHeaders(folderRoot.request?.headers);
        if (ocHeaders) {
          ocFolder.request.headers = ocHeaders;
        }
      }

      // auth
      if (hasRequestAuth(folderRoot)) {
        const ocAuth: Auth | undefined = toOpenCollectionAuth(folderRoot.request?.auth);
        if (ocAuth) {
          ocFolder.request.auth = ocAuth;
        }
      }

      // variables
      if (folderRoot.request?.vars?.req?.length) {
        const ocVariables: Variable[] | undefined = toOpenCollectionVariables(folderRoot.request?.vars);
        if (ocVariables) {
          ocFolder.request.variables = ocVariables;
        }
      }

      // scripts
      if (hasRequestScripts(folderRoot)) {
        const ocScripts: Scripts | undefined = toOpenCollectionScripts(folderRoot?.request);
        if (ocScripts) {
          ocFolder.request.scripts = ocScripts;
        }
      }
    }

    // docs
    if (folderRoot.docs?.trim().length) {
      ocFolder.docs = {
        content: folderRoot.docs,
        type: 'text/markdown'
      };
    }

    return stringifyYml(ocFolder);
  } catch (error) {
    console.error('Error stringifying folder.yml:', error);
    throw error;
  }
};
export default stringifyFolder;
