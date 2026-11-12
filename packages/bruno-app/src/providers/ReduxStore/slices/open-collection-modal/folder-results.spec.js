import { getFolderSearchOutcome } from './folder-results';

const folder = (path, status, collectionPaths = [], importableFiles = []) => ({ path, status, collectionPaths, importableFiles });

const searchResult = ({ folders, collections = [], brokenCollectionPaths = [], unreadableFolderCount = 0, stoppedEarly = false }) => ({
  folders,
  collections,
  brokenCollectionPaths,
  unreadableFolderCount,
  stoppedEarly
});

const HINT = 'A collection folder has a bruno.json or opencollection.yml at its top level.';
const STOPPED_EARLY = 'Bruno stopped searching after too many folders, so some collections may be missing.';
const nothingOpen = new Set();

const api = { path: '/work/api', name: 'API' };
const billing = { path: '/work/billing', name: 'Billing' };
const orders = { path: '/shop/orders', name: 'Orders' };

describe('getFolderSearchOutcome with one folder', () => {
  it.each([
    ['not-found', 'api doesn’t exist anymore.'],
    ['no-access', 'Bruno can’t read api. Check its permissions.'],
    ['not-a-folder', 'api isn’t a folder.'],
    ['unreadable', 'Bruno couldn’t read api.'],
    ['broken-collection', 'Bruno can’t open api because its config can’t be read. Check its bruno.json or opencollection.yml.']
  ])('explains a %s folder', (status, text) => {
    const outcome = getFolderSearchOutcome(searchResult({ folders: [folder('/work/api', status)] }), nothingOpen);

    expect(outcome).toEqual({ type: 'message', note: { tone: 'warning', text } });
  });

  it('opens a collection that is not open yet', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder(api.path, 'collection', [api.path])], collections: [api] }),
      nothingOpen
    );

    expect(outcome).toEqual({ type: 'open', paths: [api.path], skippedText: '' });
  });

  it('switches to a collection that is already open', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder(api.path, 'collection', [api.path])], collections: [api] }),
      new Set([api.path])
    );

    expect(outcome).toEqual({ type: 'switch', path: api.path, name: 'API', skippedText: '' });
  });

  it('lists the collections inside a plain folder', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder('/work', 'folder', [billing.path, api.path])], collections: [billing, api] }),
      nothingOpen
    );

    expect(outcome).toEqual({
      type: 'list',
      collections: [billing, api],
      folders: ['/work'],
      preselect: [],
      note: { tone: 'info', text: 'work isn’t a collection itself, but it has 2 collections inside. Pick the ones to open.' }
    });
  });

  it('leaves the picking to the user even when one collection inside can be opened', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder('/work', 'folder', [api.path, billing.path])], collections: [api, billing] }),
      new Set([api.path])
    );

    expect(outcome.preselect).toEqual([]);
  });

  it('says the same thing when every collection inside is already open', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder('/work', 'folder', [api.path, billing.path])], collections: [api, billing] }),
      new Set([api.path, billing.path])
    );

    expect(outcome.note.text).toBe('work isn’t a collection itself, but it has 2 collections inside. Pick the ones to open.');
  });

  it('explains a folder without collections', () => {
    const outcome = getFolderSearchOutcome(searchResult({ folders: [folder('/work/notes', 'folder')] }), nothingOpen);

    expect(outcome).toEqual({ type: 'message', note: { tone: 'info', text: `notes isn’t a Bruno collection. ${HINT}` } });
  });

  it.each([
    ['postman', 'Orders.postman_collection.json', 'a Postman export'],
    ['insomnia', 'insomnia.json', 'an Insomnia export'],
    ['openapi', 'openapi.yaml', 'an OpenAPI spec'],
    ['zip', 'backup.zip', 'an importable file']
  ])('says a folder with %s files needs importing', (format, name, label) => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder('/work/exports', 'folder', [], [{ path: `/work/exports/${name}`, name, format }])] }),
      nothingOpen
    );

    expect(outcome).toEqual({
      type: 'message',
      note: { tone: 'info', text: `exports isn’t a collection, but it has ${label} in it (${name}). That needs importing, not opening.` }
    });
  });

  it('names the first importable file and warns when folders inside could not be read', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({
        folders: [folder('/work/exports', 'folder', [], [
          { name: 'a.zip', format: 'zip' },
          { name: 'openapi.yaml', format: 'openapi' }
        ])],
        unreadableFolderCount: 1
      }),
      nothingOpen
    );

    expect(outcome.note).toEqual({
      tone: 'warning',
      text: 'exports isn’t a collection, but it has an importable file in it (a.zip). That needs importing, not opening. Bruno couldn’t read 1 folder inside it.'
    });
  });

  it('says how many folders inside could not be read when nothing was found', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder('/work', 'folder')], unreadableFolderCount: 3 }),
      nothingOpen
    );

    expect(outcome.note).toEqual({
      tone: 'warning',
      text: `work isn’t a Bruno collection. ${HINT} Bruno couldn’t read 3 folders inside it.`
    });
  });

  it('says how many collections inside cannot be opened when none of them can', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder('/work', 'folder')], brokenCollectionPaths: ['/work/api', '/work/billing'] }),
      nothingOpen
    );

    expect(outcome).toEqual({
      type: 'message',
      note: { tone: 'warning', text: 'work has no collections Bruno can open. 2 collections were skipped because their config can’t be read.' }
    });
  });

  it('lists the collections that can be opened and counts the one that cannot', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder('/work', 'folder', [billing.path])], collections: [billing], brokenCollectionPaths: [api.path] }),
      nothingOpen
    );

    expect(outcome.collections).toEqual([billing]);
    expect(outcome.note).toEqual({
      tone: 'warning',
      text: 'work isn’t a collection itself, but it has 1 collection inside. Pick the ones to open. 1 collection was skipped because its config can’t be read.'
    });
  });

  it('lists what it found and warns about the folders inside it could not read', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder('/work', 'folder', [api.path])], collections: [api], unreadableFolderCount: 1 }),
      nothingOpen
    );

    expect(outcome.collections).toEqual([api]);
    expect(outcome.note).toEqual({
      tone: 'warning',
      text: 'work isn’t a collection itself, but it has 1 collection inside. Pick the ones to open. Bruno couldn’t read 1 folder inside it.'
    });
  });

  it('warns that collections may be missing when the search stopped early', () => {
    const empty = getFolderSearchOutcome(searchResult({ folders: [folder('/', 'folder')], stoppedEarly: true }), nothingOpen);
    const listed = getFolderSearchOutcome(
      searchResult({ folders: [folder('/work', 'folder', [api.path])], collections: [api], stoppedEarly: true }),
      nothingOpen
    );

    expect(empty.note).toEqual({ tone: 'warning', text: `/ isn’t a Bruno collection. ${HINT} ${STOPPED_EARLY}` });
    expect(listed.note.tone).toBe('warning');
    expect(listed.note.text).toContain(STOPPED_EARLY);
  });
});

describe('getFolderSearchOutcome with files dropped along with folders', () => {
  it('adds them to the note of a list', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder('/work', 'folder', [api.path])], collections: [api] }),
      nothingOpen,
      2
    );

    expect(outcome.note.text).toBe(
      'work isn’t a collection itself, but it has 1 collection inside. Pick the ones to open. 2 dropped files weren’t opened. Use Import file or URL to import them.'
    );
  });

  it('adds them to the note of a message', () => {
    const outcome = getFolderSearchOutcome(searchResult({ folders: [folder('/work/notes', 'folder')] }), nothingOpen, 1);

    expect(outcome.note.text).toBe(`notes isn’t a Bruno collection. ${HINT} 1 dropped file wasn’t opened. Use Import file or URL to import it.`);
  });

  it('adds them to the skipped text when the collection opens straight away', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder(api.path, 'collection', [api.path])], collections: [api] }),
      nothingOpen,
      1
    );

    expect(outcome).toEqual({ type: 'open', paths: [api.path], skippedText: '1 dropped file wasn’t opened. Use Import file or URL to import it.' });
  });
});

describe('getFolderSearchOutcome with several folders', () => {
  it('opens every picked collection that is not open yet', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({
        folders: [folder(api.path, 'collection', [api.path]), folder(orders.path, 'collection', [orders.path])],
        collections: [api, orders]
      }),
      new Set([api.path])
    );

    expect(outcome).toEqual({ type: 'open', paths: [orders.path], skippedText: '' });
  });

  it('says which picked folders were skipped and why', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({
        folders: [
          folder(api.path, 'collection', [api.path]),
          folder('/work/docs', 'folder'),
          folder('/work/notes', 'folder'),
          folder('/work/secrets', 'no-access')
        ],
        collections: [api]
      }),
      nothingOpen
    );

    expect(outcome).toEqual({
      type: 'open',
      paths: [api.path],
      skippedText: 'docs, notes aren’t collections, so they were skipped. Bruno couldn’t read secrets.'
    });
  });

  it('says how many picked collections cannot be opened when it opens the rest', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({
        folders: [folder(api.path, 'collection', [api.path]), folder(billing.path, 'broken-collection')],
        collections: [api],
        brokenCollectionPaths: [billing.path]
      }),
      nothingOpen
    );

    expect(outcome).toEqual({ type: 'open', paths: [api.path], skippedText: '1 collection was skipped because its config can’t be read.' });
  });

  it('uses the singular when one picked folder is not a collection', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder(api.path, 'collection', [api.path]), folder('/work/docs', 'folder')], collections: [api] }),
      nothingOpen
    );

    expect(outcome.skippedText).toBe('docs isn’t a collection, so it was skipped.');
  });

  it('switches to the one picked collection when it is already open', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder(api.path, 'collection', [api.path]), folder('/work/docs', 'folder')], collections: [api] }),
      new Set([api.path])
    );

    expect(outcome).toEqual({
      type: 'switch',
      path: api.path,
      name: 'API',
      skippedText: 'docs isn’t a collection, so it was skipped.'
    });
  });

  it('says when every picked collection is already open', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({
        folders: [folder(api.path, 'collection', [api.path]), folder(orders.path, 'collection', [orders.path])],
        collections: [api, orders]
      }),
      new Set([api.path, orders.path])
    );

    expect(outcome).toEqual({ type: 'already-open', skippedText: '' });
  });

  it('lists everything found and preselects the picked collections when a folder has collections inside', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({
        folders: [
          folder(orders.path, 'collection', [orders.path]),
          folder('/work', 'folder', [api.path, billing.path]),
          folder('/work/docs', 'folder')
        ],
        collections: [orders, api, billing]
      }),
      new Set([billing.path])
    );

    expect(outcome).toEqual({
      type: 'list',
      collections: [orders, api, billing],
      folders: ['/work'],
      preselect: [orders.path],
      note: {
        tone: 'info',
        text: 'Found 3 collections in the folders you picked. Pick the ones to open. docs isn’t a collection, so it was skipped.'
      }
    });
  });

  it('preselects every picked collection, including one that is already open', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({
        folders: [folder(orders.path, 'collection', [orders.path]), folder('/work', 'folder', [api.path])],
        collections: [orders, api]
      }),
      new Set([orders.path])
    );

    expect(outcome.preselect).toEqual([orders.path]);
  });

  it('lists the picked collections before the ones found inside folders', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({
        folders: [folder('/work', 'folder', [api.path, billing.path]), folder(orders.path, 'collection', [orders.path])],
        collections: [api, billing, orders]
      }),
      nothingOpen
    );

    expect(outcome.collections).toEqual([orders, api, billing]);
    expect(outcome.folders).toEqual(['/work']);
  });

  it('says the same thing when every collection found is already open', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({
        folders: [folder('/work', 'folder', [api.path, billing.path]), folder('/shop', 'folder', [orders.path])],
        collections: [api, billing, orders]
      }),
      new Set([api.path, billing.path, orders.path])
    );

    expect(outcome.note.text).toBe('Found 3 collections in the folders you picked. Pick the ones to open.');
  });

  it('lists a collection once when it was found through two picked folders', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder('/work', 'folder', [api.path]), folder('/work/sub', 'folder', [api.path])], collections: [api] }),
      nothingOpen
    );

    expect(outcome.collections).toEqual([api]);
    expect(outcome.note.text).toMatch(/^Found 1 collection in/);
  });

  it('explains when none of the folders is a collection', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder('/work/docs', 'folder'), folder('/work/notes', 'folder')] }),
      nothingOpen
    );

    expect(outcome).toEqual({ type: 'message', note: { tone: 'info', text: `None of those folders is a Bruno collection. ${HINT}` } });
  });

  it('warns when the only collections among the folders cannot be opened', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder(billing.path, 'broken-collection'), folder('/work/docs', 'folder')], brokenCollectionPaths: [billing.path] }),
      nothingOpen
    );

    expect(outcome).toEqual({
      type: 'message',
      note: { tone: 'warning', text: 'None of those folders has a collection Bruno can open. 1 collection was skipped because its config can’t be read.' }
    });
  });

  it('warns when some of the folders could not be read and none is a collection', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder('/work/docs', 'folder'), folder('/work/secrets', 'no-access')], unreadableFolderCount: 2 }),
      nothingOpen
    );

    expect(outcome.note).toEqual({
      tone: 'warning',
      text: `None of those folders is a Bruno collection. ${HINT} Bruno couldn’t read secrets. Bruno couldn’t read 2 folders inside them.`
    });
  });

  it('explains each picked folder when none of them could be searched', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder('/work/gone', 'not-found'), folder('/work/secrets', 'no-access')] }),
      nothingOpen
    );

    expect(outcome).toEqual({
      type: 'message',
      note: { tone: 'warning', text: 'gone doesn’t exist anymore. Bruno can’t read secrets. Check its permissions.' }
    });
  });

  it('says how many folders inside the picks it could not read when it lists what it found', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({
        folders: [folder(api.path, 'collection', [api.path]), folder('/work', 'folder', [billing.path])],
        collections: [api, billing],
        unreadableFolderCount: 2
      }),
      nothingOpen
    );

    expect(outcome.note).toEqual({
      tone: 'warning',
      text: 'Found 2 collections in the folders you picked. Pick the ones to open. Bruno couldn’t read 2 folders inside them.'
    });
  });

  it('says how many folders inside the picks it could not read when it opens the picked collections', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({ folders: [folder(api.path, 'collection', [api.path]), folder('/work/docs', 'folder')], collections: [api], unreadableFolderCount: 1 }),
      nothingOpen
    );

    expect(outcome.skippedText).toBe('docs isn’t a collection, so it was skipped. Bruno couldn’t read 1 folder inside them.');
  });

  it('adds the stopped-early warning to the skipped text when it opens the picked collections', () => {
    const outcome = getFolderSearchOutcome(
      searchResult({
        folders: [folder(api.path, 'collection', [api.path]), folder('/work/b', 'folder')],
        collections: [api],
        stoppedEarly: true
      }),
      nothingOpen
    );

    expect(outcome.skippedText).toContain(STOPPED_EARLY);
  });
});
