import { uuid } from '../common';
import { extractPackagesFromScript } from './postman-package-detector';
import { emptyAuth, isSupportedAuthType, toBrunoAuth } from './helpers/auth';
import { emptyBody, toBrunoFileBody, toBrunoFormUrlEncodedBody, toBrunoMultipartBody, toBrunoRawBody } from './helpers/body';
import { getResponseBodyType, toExampleName } from './helpers/examples';
import { toBrunoHeaders, toBrunoPathParams, toBrunoQueryParams } from './helpers/key-values';
import { createScriptTranslator, toWorkerEvents, translateScriptsInWorkers } from './helpers/scripts';
import { toBrunoRequestSettings } from './helpers/settings';
import { toBrunoRequestVars } from './helpers/variables';
import { createUniqueNamer, ensureString, stripUrlFragment, toKeyValueObject, transformDescription } from './helpers/values';

const ITEM_KINDS = Object.freeze({
  FOLDER: 'collection',
  HTTP: 'http-request'
});

const RAW_BODY_TYPES = new Set(['json', 'xml', 'text', 'html', 'javascript']);

// Collection and folder scripts carry a protocol prefix (`http:beforeRequest`); request scripts do not.
const SCRIPT_PHASES = {
  'beforeRequest': 'req',
  'http:beforeRequest': 'req',
  'afterResponse': 'res',
  'http:afterResponse': 'res'
};

export const isPostmanV3Collection = (collection) => {
  return collection?.$kind === ITEM_KINDS.FOLDER && Array.isArray(collection.items);
};

const joinPath = (parentPath, name) => (parentPath ? `${parentPath} / ${name}` : name);

// Collection/folder auth is a one-entry list, request auth a single object; Postman treats missing or `inherit` as inherit.
const readAuth = (auth) => {
  const entry = Array.isArray(auth) ? auth[0] : auth;
  if (!entry || typeof entry !== 'object' || !entry.type || entry.type === 'inherit') return null;
  return { type: entry.type, values: toKeyValueObject(entry.credentials) };
};

const importAuth = (auth, defaultMode, { issues, path }) => {
  const postmanAuth = readAuth(auth);
  if (!postmanAuth) return emptyAuth(defaultMode);

  if (!isSupportedAuthType(postmanAuth.type)) {
    issues.push({ path, severity: 'warning', message: `Unsupported auth type "${postmanAuth.type}", imported as no auth` });
  }
  return toBrunoAuth(postmanAuth.type, postmanAuth.values);
};

const readScripts = (scripts, { issues, path }) => {
  const sources = { req: [], res: [] };

  (Array.isArray(scripts) ? scripts : []).forEach((script) => {
    if (!script || typeof script.code !== 'string' || !script.code.trim()) return;

    const phase = SCRIPT_PHASES[script.type];
    if (!phase) {
      issues.push({ path, severity: 'warning', message: `Unsupported script type "${script.type}", not imported` });
      return;
    }
    sources[phase].push(script.code);
  });

  return {
    req: sources.req.join('\n'),
    res: sources.res.join('\n')
  };
};

const toBrunoBody = (body, { issues, path }) => {
  if (body == null) return emptyBody();

  if (typeof body !== 'object' || !body.type) {
    issues.push({ path, severity: 'warning', message: 'Malformed body (no type), imported without a body' });
    return emptyBody();
  }

  const { type, content } = body;
  if (type === 'none') return emptyBody();
  if (RAW_BODY_TYPES.has(type)) return toBrunoRawBody(type, ensureString(content));
  if (type === 'formdata') return toBrunoMultipartBody(content);
  if (type === 'urlencoded') return toBrunoFormUrlEncodedBody(content);
  if (type === 'file') return toBrunoFileBody(content?.src);

  issues.push({ path, severity: 'warning', message: `Unsupported body type "${type}", imported without a body` });
  return emptyBody();
};

// Postman sends a request without a method as GET.
const readMethod = (method, fallback) => {
  const normalized = typeof method === 'string' ? method.trim().toUpperCase() : '';
  return normalized || fallback;
};

const toBrunoParams = (item) => [
  ...toBrunoQueryParams(item.queryParams),
  ...toBrunoPathParams(item.pathVariables)
];

const toBrunoExample = (example, index, { itemUid, method, issues, path }) => {
  const request = example.request && typeof example.request === 'object' ? example.request : {};
  const response = example.response && typeof example.response === 'object' ? example.response : {};
  const name = toExampleName(example.name, index);
  const examplePath = joinPath(path, name);

  return {
    uid: uuid(),
    itemUid,
    name,
    description: transformDescription(example.description),
    type: 'http-request',
    request: {
      url: stripUrlFragment(request.url),
      method: readMethod(request.method, method),
      headers: toBrunoHeaders(request.headers),
      params: toBrunoParams(request),
      body: toBrunoBody(request.body, { issues, path: examplePath })
    },
    response: {
      status: response.statusCode || null,
      statusText: ensureString(response.statusText),
      headers: toBrunoHeaders(response.headers),
      body: {
        type: getResponseBodyType(response.headers),
        content: ensureString(response.body?.content)
      }
    }
  };
};

const createImporter = ({ preserveScripts, logTranslationFailures, scriptMap }) => {
  const issues = [];
  const scriptUsages = [];
  const translate = createScriptTranslator({ preserveScripts, logTranslationFailures, issues, scriptUsages });

  const importScripts = (scripts, brunoUid, request, path) => {
    const { req, res } = readScripts(scripts, { issues, path });
    if (!req && !res) return;

    if (scriptMap) {
      scriptMap.set(brunoUid, { events: toWorkerEvents({ req, res }) });
      return;
    }

    request.script = {
      ...(req ? { req: translate(req, path) } : {}),
      ...(res ? { res: translate(res, path) } : {})
    };
  };

  const importRequest = (item, { name, filename, seq, path }) => {
    const method = readMethod(item.method, 'GET');
    const uid = uuid();
    const request = {
      url: stripUrlFragment(item.url),
      method,
      auth: importAuth(item.auth, 'inherit', { issues, path }),
      headers: toBrunoHeaders(item.headers),
      params: toBrunoParams(item),
      body: toBrunoBody(item.body, { issues, path }),
      docs: transformDescription(item.description)
    };

    importScripts(item.scripts, uid, request, path);

    const brunoItem = {
      uid,
      name,
      filename,
      type: 'http-request',
      seq,
      request,
      settings: toBrunoRequestSettings(item.settings, (message) => issues.push({ path, severity: 'warning', message }))
    };

    if (Array.isArray(item.examples)) {
      brunoItem.examples = item.examples
        .filter((example) => example && typeof example === 'object')
        .map((example, index) => toBrunoExample(example, index, { itemUid: uid, method, issues, path }));
    }

    return brunoItem;
  };

  const importFolder = (item, { name, filename, seq, path }) => {
    const uid = uuid();
    const request = {
      auth: importAuth(item.auth, 'inherit', { issues, path }),
      headers: [],
      script: {},
      tests: '',
      vars: {}
    };

    importScripts(item.scripts, uid, request, path);

    return {
      uid,
      name,
      filename,
      type: 'folder',
      seq,
      items: importItems(item.items, path),
      root: {
        docs: transformDescription(item.description),
        meta: { name },
        request
      }
    };
  };

  const importItems = (items, parentPath = '') => {
    const nameFolder = createUniqueNamer();
    const nameRequest = createUniqueNamer();
    const brunoItems = [];

    (Array.isArray(items) ? items : []).forEach((item, index) => {
      const fallbackName = `Item ${index + 1}`;

      if (!item || typeof item !== 'object') {
        issues.push({ path: joinPath(parentPath, fallbackName), severity: 'error', message: 'Malformed collection item (not an object)' });
        return;
      }

      const path = joinPath(parentPath, item.name || fallbackName);
      const seq = index + 1;

      try {
        if (item.$kind === ITEM_KINDS.FOLDER) {
          const name = item.name || 'Untitled Folder';
          brunoItems.push(importFolder(item, { name, filename: nameFolder(name), seq, path }));
        } else if (item.$kind === ITEM_KINDS.HTTP) {
          const name = item.name || 'Untitled Request';
          brunoItems.push(importRequest(item, { name, filename: nameRequest(name), seq, path }));
        } else {
          issues.push({ path, severity: 'error', message: `Unsupported item type "${item.$kind}", not imported`, sourceItem: item });
        }
      } catch (err) {
        issues.push({ path, severity: 'error', message: err.message, sourceItem: item });
      }
    });

    return brunoItems;
  };

  const importCollectionRoot = (collection, name) => {
    const path = 'Collection';
    const request = {
      auth: importAuth(collection.auth, 'none', { issues, path }),
      headers: [],
      script: {},
      tests: '',
      vars: {}
    };

    // Collection scripts are always translated inline; the worker only handles folders and requests.
    const { req, res } = readScripts(collection.scripts, { issues, path });
    if (req) request.script.req = translate(req, path);
    if (res) request.script.res = translate(res, path);

    if (Array.isArray(collection.variables)) {
      request.vars.req = toBrunoRequestVars(collection.variables);
    }

    return {
      docs: transformDescription(collection.description),
      meta: { name },
      request
    };
  };

  return { issues, scriptUsages, importItems, importCollectionRoot };
};

export const importPostmanV3Collection = async (collection, { useWorkers = false, preserveScripts = false, logTranslationFailures = true }) => {
  const scriptMap = useWorkers && !preserveScripts ? new Map() : null;
  const { issues, scriptUsages, importItems, importCollectionRoot } = createImporter({ preserveScripts, logTranslationFailures, scriptMap });

  const name = collection.name || 'Untitled Collection';
  const brunoCollection = {
    name,
    uid: uuid(),
    version: '1',
    items: [],
    environments: [],
    root: importCollectionRoot(collection, name)
  };
  brunoCollection.items = importItems(collection.items);

  if (scriptMap && scriptMap.size > 0) {
    await translateScriptsInWorkers(brunoCollection.items, scriptMap, scriptUsages);
  }

  return { collection: brunoCollection, issues, scriptUsages };
};

export const collectPackagesFromPostmanV3Collection = (collection) => {
  const packages = new Set();

  const visit = (node) => {
    if (!node || typeof node !== 'object') return;
    (Array.isArray(node.scripts) ? node.scripts : []).forEach((script) => {
      if (typeof script?.code !== 'string' || !script.code) return;
      extractPackagesFromScript(script.code).packages.forEach((pkg) => packages.add(pkg));
    });
    (Array.isArray(node.items) ? node.items : []).forEach(visit);
  };

  visit(collection);
  return Array.from(packages);
};
