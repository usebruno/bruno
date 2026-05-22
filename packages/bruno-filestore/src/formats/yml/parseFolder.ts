import type { FolderRoot } from '@usebruno/schema-types/collection/folder';
import type { Folder } from '@opencollection/types/collection/item';
import { parseYml } from './utils';
import { toBrunoAuth } from './common/auth';
import { toBrunoHttpHeaders } from './common/headers';
import { toBrunoVariables } from './common/variables';
import { toBrunoPostResponseVariables } from './common/actions';
import { toBrunoScripts } from './common/scripts';
import { ensureString } from '../../utils';

const parseFolder = (ymlString: string): FolderRoot => {
  try {
    const ocFolder: Folder = parseYml(ymlString);

    const info = ocFolder.info;

    const folderRoot: FolderRoot = {
      meta: {
        name: ensureString(info?.name, 'Untitled Folder'),
        seq: info?.seq || 1
      },
      request: {
        headers: [],
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
      },
      docs: null
    };

    if (ocFolder.request) {
      const folderRequest = folderRoot.request!;
      // auth
      const auth = toBrunoAuth(ocFolder.request.auth);
      if (auth) {
        folderRequest.auth = auth;
      }

      // headers
      const headers = toBrunoHttpHeaders(ocFolder.request.headers);
      if (headers) {
        folderRequest.headers = headers;
      }

      // variables
      const variables = toBrunoVariables(ocFolder.request.variables);
      const postResponseVars = toBrunoPostResponseVariables((ocFolder.request as any).actions);
      folderRequest.vars = {
        req: variables.req,
        res: postResponseVars
      };

      // scripts
      const scripts = toBrunoScripts(ocFolder.request.scripts);
      if (scripts?.script && folderRequest.script) {
        if (scripts.script.req) {
          folderRequest.script.req = scripts.script.req;
        }
        if (scripts.script.res) {
          folderRequest.script.res = scripts.script.res;
        }
      }
      if (scripts?.tests) {
        folderRequest.tests = scripts.tests;
      }
    }

    // docs (now at root level)
    if (ocFolder.docs) {
      if (typeof ocFolder.docs === 'string' && ocFolder.docs.trim().length) {
        folderRoot.docs = ocFolder.docs;
      } else if (typeof ocFolder.docs === 'object' && ocFolder.docs.content?.trim().length) {
        folderRoot.docs = ocFolder.docs.content;
      }
    }

    return folderRoot;
  } catch (error) {
    console.error('Error parsing folder:', error);
    throw error;
  }
};

export default parseFolder;
