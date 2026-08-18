/**
 * How a collection's files are named on disk.
 *
 * A layout key is not the same thing as a *serialization format*. `.yml` and `.yaml` hold
 * identical OpenCollection YAML, so `@usebruno/filestore` accepts either spelling and both are
 * handled by its `yml` serializer — a layout key can be passed straight to any filestore
 * `parse*`/`stringify*` call. What a layout key does determine is every filename Bruno writes,
 * so read {@link COLLECTION_LAYOUTS} rather than interpolating the key into a filename.
 */
export type CollectionLayout = 'bru' | 'yml' | 'yaml';

export interface CollectionLayoutConfig {
  /** Extension of request and environment files, including the leading dot. */
  ext: string;
  /** Basename of the collection root file. */
  collectionFile: string;
  /** Basename of a folder root file. */
  folderFile: string;
  /**
   * Basename whose presence identifies a directory as a collection of this layout. For `bru` this
   * is `bruno.json`, not `collectionFile` — `collection.bru` is optional.
   */
  marker: string;
  /** Root basenames this layout still reads but no longer writes. */
  legacyCollectionFiles: string[];
}

export const COLLECTION_LAYOUTS: Record<CollectionLayout, CollectionLayoutConfig> = {
  yml: {
    ext: '.yml',
    collectionFile: 'opencollection.yml',
    folderFile: 'folder.yml',
    marker: 'opencollection.yml',
    // Predates `opencollection.yml`.
    legacyCollectionFiles: ['collection.yml']
  },
  yaml: {
    ext: '.yaml',
    collectionFile: 'opencollection.yaml',
    folderFile: 'folder.yaml',
    marker: 'opencollection.yaml',
    legacyCollectionFiles: []
  },
  bru: {
    ext: '.bru',
    collectionFile: 'collection.bru',
    folderFile: 'folder.bru',
    marker: 'bruno.json',
    legacyCollectionFiles: []
  }
};

/**
 * Detection precedence. `yml` comes before `yaml` because `.yml` is what Bruno writes, so it wins
 * if a directory somehow contains both roots. `bru` is last because a collection migrated to
 * OpenCollection may still have a stale `bruno.json` beside its new root.
 */
export const COLLECTION_LAYOUT_ORDER: CollectionLayout[] = ['yml', 'yaml', 'bru'];

/** The OpenCollection layouts — every layout whose files are YAML. */
const OPEN_COLLECTION_LAYOUTS: CollectionLayout[] = ['yml', 'yaml'];

/** Both extensions that carry OpenCollection YAML, in detection-precedence order. */
export const YAML_EXTENSIONS = OPEN_COLLECTION_LAYOUTS.map((layout) => COLLECTION_LAYOUTS[layout].ext);

/** Every extension a request file can use, in detection-precedence order. */
const REQUEST_EXTENSIONS = COLLECTION_LAYOUT_ORDER.map((layout) => COLLECTION_LAYOUTS[layout].ext);

/** Basenames Bruno writes as a collection root, across all layouts. */
export const COLLECTION_ROOT_BASENAMES = COLLECTION_LAYOUT_ORDER.map(
  (layout) => COLLECTION_LAYOUTS[layout].collectionFile
);

/**
 * Every basename that may be a collection root on disk, including names Bruno no longer writes.
 * Prefer {@link isCollectionRootBasename}, which matches this list case-insensitively.
 */
export const READABLE_COLLECTION_ROOT_BASENAMES = COLLECTION_LAYOUT_ORDER.flatMap((layout) => [
  COLLECTION_LAYOUTS[layout].collectionFile,
  ...COLLECTION_LAYOUTS[layout].legacyCollectionFiles
]);

/**
 * The basenames whose presence identifies a directory as a collection, in detection-precedence
 * order. Scanning for collections must use this rather than the root-file lists — a `bru`
 * collection is identified by `bruno.json`, and a stray `collection.bru` is not a collection.
 */
export const COLLECTION_MARKER_BASENAMES = COLLECTION_LAYOUT_ORDER.map(
  (layout) => COLLECTION_LAYOUTS[layout].marker
);

/** Basenames that mark a directory as a folder root, across all layouts. */
export const FOLDER_ROOT_BASENAMES = COLLECTION_LAYOUT_ORDER.map(
  (layout) => COLLECTION_LAYOUTS[layout].folderFile
);

const lowercaseExtension = (filename: string): string => {
  const lastDot = filename.lastIndexOf('.');
  return lastDot === -1 ? '' : filename.slice(lastDot).toLowerCase();
};

// Windows and macOS filesystems are case-insensitive, so `OpenCollection.YML` and `Folder.Yml`
// are the same files as their lowercase spellings and must classify identically. Compare every
// basename case-insensitively for the same reason extensions are folded above.
const includesBasename = (basenames: string[], basename: string): boolean => {
  const needle = basename.toLowerCase();
  return basenames.some((candidate) => candidate.toLowerCase() === needle);
};

const stripExtensionIf = (filename: string, matches: (name: string) => boolean): string =>
  matches(filename) ? filename.slice(0, filename.lastIndexOf('.')) : filename;

/**
 * The layout config for a layout key. Falls back when the key is missing or unrecognized, which
 * happens in the renderer for a collection whose format has not loaded yet — pass the fallback
 * that suits the caller rather than letting each site invent one.
 */
export const getLayoutConfig = (
  layout: string | null | undefined,
  fallback: CollectionLayout = 'bru'
): CollectionLayoutConfig => COLLECTION_LAYOUTS[layout as CollectionLayout] || COLLECTION_LAYOUTS[fallback];

/** True for both OpenCollection layouts — use instead of comparing a layout to `'yml'`. */
export const isOpenCollectionLayout = (layout: string | null | undefined): boolean =>
  OPEN_COLLECTION_LAYOUTS.includes(layout as CollectionLayout);

/** True when the filename carries either OpenCollection YAML extension. */
export const isYamlFilename = (filename: string | null | undefined): boolean =>
  typeof filename === 'string' && YAML_EXTENSIONS.includes(lowercaseExtension(filename));

/** True when the filename carries any layout's request extension. */
export const isRequestFilename = (filename: string | null | undefined): boolean =>
  typeof filename === 'string' && REQUEST_EXTENSIONS.includes(lowercaseExtension(filename));

/** Drop a trailing `.yml`/`.yaml`, leaving any other filename untouched. */
export const stripYamlExtension = (filename: string): string => stripExtensionIf(filename, isYamlFilename);

/** Drop a trailing request extension (`.bru`/`.yml`/`.yaml`), leaving any other filename untouched. */
export const stripRequestExtension = (filename: string): string =>
  stripExtensionIf(filename, isRequestFilename);

/** The layout a file belongs to, based on its extension, or null if it isn't a Bruno file. */
export const getLayoutForFilename = (filename: string | null | undefined): CollectionLayout | null => {
  if (typeof filename !== 'string') return null;
  const ext = lowercaseExtension(filename);
  return COLLECTION_LAYOUT_ORDER.find((layout) => COLLECTION_LAYOUTS[layout].ext === ext) || null;
};

/** True when `basename` is a collection root Bruno can read, including legacy names. */
export const isCollectionRootBasename = (basename: string): boolean =>
  includesBasename(READABLE_COLLECTION_ROOT_BASENAMES, basename);

/** True when `basename` is any layout's folder root. */
export const isFolderRootBasename = (basename: string): boolean =>
  includesBasename(FOLDER_ROOT_BASENAMES, basename);

/** True when `basename` is the marker that identifies a collection directory. */
export const isCollectionMarkerBasename = (basename: string): boolean =>
  includesBasename(COLLECTION_MARKER_BASENAMES, basename);
