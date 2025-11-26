import type { FolderRoot } from '@usebruno/schema-types/collection/folder';
import type { Folder } from '@opencollection/types/collection/item';
import { parseYml } from './utils';
import { toBrunoAuth } from './common/auth';
import { toBrunoHttpHeaders } from './common/headers';
import { toBrunoVariables } from './common/variables';
import { toBrunoScripts } from './common/scripts';
import { isNonEmptyString } from '../../utils';

const parseFolder = (ymlString: string): FolderRoot => {
  try {
    const ocFolder: Folder = parseYml(ymlString);

    const folderRoot: FolderRoot = {
      meta: {
        name: ocFolder.name || 'Untitled Folder',
        seq: ocFolder.seq || 1
      },
      request: null,
      docs: null
    };

    // request defaults
    if (ocFolder.request) {
      folderRoot.request = {
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
      };

      // headers
      const headers = toBrunoHttpHeaders(ocFolder.request.headers);
      if (headers) {
        folderRoot.request.headers = headers;
      }

      // auth
      const auth = toBrunoAuth(ocFolder.request.auth);
      if (auth) {
        folderRoot.request.auth = auth;
      }

      // variables
      const variables = toBrunoVariables(ocFolder.request.variables);
      folderRoot.request.vars = variables;

      // scripts
      const scripts = toBrunoScripts(ocFolder.request.scripts);
      if (scripts?.script && folderRoot.request.script) {
        if (scripts.script.req) {
          folderRoot.request.script.req = scripts.script.req;
        }
        if (scripts.script.res) {
          folderRoot.request.script.res = scripts.script.res;
        }
      }
      if (scripts?.tests) {
        folderRoot.request.tests = scripts.tests;
      }
    }

    // docs
    if (isNonEmptyString(ocFolder.docs)) {
      folderRoot.docs = ocFolder.docs;
    }

    return folderRoot;
  } catch (error) {
    console.error('Error parsing folder:', error);
    throw error;
  }
};

export default parseFolder;
