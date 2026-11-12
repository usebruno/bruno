import { pluralizeWord } from 'utils/common';
import { getFolderName, toPathKey } from './collection-paths';

const COLLECTION_FOLDER_HINT = 'A collection folder has a bruno.json or opencollection.yml at its top level.';
const STOPPED_EARLY_TEXT = 'Bruno stopped searching after too many folders, so some collections may be missing.';
const UNREADABLE_STATUSES = ['not-found', 'no-access', 'unreadable'];

const FOLDER_PROBLEMS = {
  'not-found': (name) => `${name} doesn’t exist anymore.`,
  'no-access': (name) => `Bruno can’t read ${name}. Check its permissions.`,
  'not-a-folder': (name) => `${name} isn’t a folder.`,
  'unreadable': (name) => `Bruno couldn’t read ${name}.`,
  'broken-collection': (name) => `Bruno can’t open ${name} because its config can’t be read. Check its bruno.json or opencollection.yml.`
};

const IMPORTABLE_FILE_LABELS = {
  postman: 'a Postman export',
  insomnia: 'an Insomnia export',
  openapi: 'an OpenAPI spec',
  zip: 'an importable file'
};

export const countOf = (count, word) => `${count} ${pluralizeWord(word, count)}`;
const unique = (values) => [...new Set(values)];
const sentences = (...parts) => parts.filter(Boolean).join(' ');

const showMessage = (tone, text) => ({ type: 'message', note: { tone, text } });

const showList = ({ collections, folders, preselect, tone, text }) => ({
  type: 'list',
  collections,
  folders,
  preselect,
  note: { tone, text }
});

const describeSkippedFolders = (folders) => {
  const namesOf = (matches) => folders.filter(matches).map((folder) => getFolderName(folder.path));
  const notCollections = namesOf((folder) => folder.status === 'not-a-folder' || folder.status === 'folder');
  const unreadable = namesOf((folder) => UNREADABLE_STATUSES.includes(folder.status));
  return {
    notCollectionsText: notCollections.length > 0
      && `${notCollections.join(', ')} ${notCollections.length === 1 ? 'isn’t a collection, so it was' : 'aren’t collections, so they were'} skipped.`,
    unreadableText: unreadable.length > 0 && `Bruno couldn’t read ${unreadable.join(', ')}.`
  };
};

const describeBrokenCollections = (count) => {
  const isOne = count === 1;
  return count > 0
    && `${countOf(count, 'collection')} ${isOne ? 'was' : 'were'} skipped because ${isOne ? 'its' : 'their'} config can’t be read.`;
};

const describeDroppedFiles = (count) => {
  const isOne = count === 1;
  return `${countOf(count, 'dropped file')} ${isOne ? 'wasn’t' : 'weren’t'} opened. Use Import file or URL to import ${isOne ? 'it' : 'them'}.`;
};

const decideOutcome = (searchResult, openPathKeys) => {
  const { folders, collections, brokenCollectionPaths, unreadableFolderCount, stoppedEarly } = searchResult;
  const isOpen = (collectionPath) => openPathKeys.has(toPathKey(collectionPath));
  const namesByPath = new Map(collections.map((collection) => [collection.path, collection.name]));
  const toRows = (paths) => paths.map((collectionPath) => ({ path: collectionPath, name: namesByPath.get(collectionPath) }));
  const stoppedEarlyText = stoppedEarly && STOPPED_EARLY_TEXT;
  const brokenText = describeBrokenCollections(brokenCollectionPaths.length);
  const searchTone = stoppedEarly || brokenText ? 'warning' : 'info';
  const describeMissing = (place) => sentences(
    unreadableFolderCount > 0 && `Bruno couldn’t read ${countOf(unreadableFolderCount, 'folder')} inside ${place}.`,
    stoppedEarlyText
  );
  const switchTo = (collectionPath, skippedText) => ({ type: 'switch', path: collectionPath, name: namesByPath.get(collectionPath), skippedText });

  if (folders.length === 1) {
    const [folder] = folders;
    const name = getFolderName(folder.path);

    if (FOLDER_PROBLEMS[folder.status]) {
      return showMessage('warning', FOLDER_PROBLEMS[folder.status](name));
    }

    if (folder.status === 'collection') {
      const [collectionPath] = folder.collectionPaths;
      return isOpen(collectionPath) ? switchTo(collectionPath, '') : { type: 'open', paths: [collectionPath], skippedText: '' };
    }

    if (folder.collectionPaths.length === 0) {
      const missingText = describeMissing('it');
      if (brokenText) {
        return showMessage('warning', sentences(`${name} has no collections Bruno can open.`, brokenText, missingText));
      }
      const tone = missingText ? 'warning' : 'info';
      if (folder.importableFiles.length > 0) {
        const [file] = folder.importableFiles;
        return showMessage(tone, sentences(
          `${name} isn’t a collection, but it has ${IMPORTABLE_FILE_LABELS[file.format]} in it (${file.name}). That needs importing, not opening.`,
          missingText
        ));
      }
      return showMessage(tone, sentences(`${name} isn’t a Bruno collection.`, COLLECTION_FOLDER_HINT, missingText));
    }

    return showList({
      collections: toRows(folder.collectionPaths),
      folders: [folder.path],
      preselect: [],
      tone: searchTone,
      text: sentences(
        `${name} isn’t a collection itself, but it has ${countOf(folder.collectionPaths.length, 'collection')} inside. Pick the ones to open.`,
        brokenText,
        stoppedEarlyText
      )
    });
  }

  if (folders.every((folder) => FOLDER_PROBLEMS[folder.status])) {
    return showMessage('warning', sentences(...folders.map((folder) => FOLDER_PROBLEMS[folder.status](getFolderName(folder.path)))));
  }

  const { notCollectionsText, unreadableText } = describeSkippedFolders(folders.filter((folder) => folder.collectionPaths.length === 0));
  const allPaths = unique(folders.flatMap((folder) => folder.collectionPaths));

  if (allPaths.length === 0) {
    const missingText = describeMissing('them');
    const nothingText = brokenText
      ? sentences('None of those folders has a collection Bruno can open.', brokenText)
      : sentences('None of those folders is a Bruno collection.', COLLECTION_FOLDER_HINT);
    return showMessage(
      brokenText || unreadableText || missingText ? 'warning' : 'info',
      sentences(nothingText, unreadableText, missingText)
    );
  }

  const directPaths = unique(folders.filter((folder) => folder.status === 'collection').flatMap((folder) => folder.collectionPaths));
  const foldersWithCollections = folders.filter((folder) => folder.status === 'folder' && folder.collectionPaths.length > 0);

  if (foldersWithCollections.length === 0) {
    const skippedText = sentences(notCollectionsText, brokenText, unreadableText, stoppedEarlyText);
    const pathsToOpen = directPaths.filter((collectionPath) => !isOpen(collectionPath));
    if (pathsToOpen.length > 0) {
      return { type: 'open', paths: pathsToOpen, skippedText };
    }
    return directPaths.length === 1 ? switchTo(directPaths[0], skippedText) : { type: 'already-open', skippedText };
  }

  return showList({
    collections: toRows(unique([...directPaths, ...allPaths])),
    folders: foldersWithCollections.map((folder) => folder.path),
    preselect: directPaths,
    tone: searchTone,
    text: sentences(
      `Found ${countOf(allPaths.length, 'collection')} in the folders you picked. Pick the ones to open.`,
      notCollectionsText,
      brokenText,
      unreadableText,
      stoppedEarlyText
    )
  });
};

export const getFolderSearchOutcome = (searchResult, openPathKeys, droppedFileCount = 0) => {
  const outcome = decideOutcome(searchResult, openPathKeys);
  if (droppedFileCount === 0) {
    return outcome;
  }
  const droppedFilesText = describeDroppedFiles(droppedFileCount);
  return outcome.note
    ? { ...outcome, note: { ...outcome.note, text: sentences(outcome.note.text, droppedFilesText) } }
    : { ...outcome, skippedText: sentences(outcome.skippedText, droppedFilesText) };
};
