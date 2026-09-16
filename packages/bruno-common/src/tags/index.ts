/**
 * Shape of any node that can carry tags. A request node *is* its file, so its tags sit at the item
 * level and mirror into `draft.tags`. A folder node is a directory that may have no root file behind
 * it at all, so its tags stay on `root.meta.tags` - the in-memory image of `folder.bru`/`folder.yml` -
 * and a folder draft, being a clone of that root, carries them at `draft.meta.tags`.
 */
export interface TaggedTreeNode {
  type?: string;
  name?: string;
  tags?: string[] | null;
  draft?: { tags?: string[] | null; meta?: { tags?: string[] | null } | null } | null;
  root?: { meta?: { tags?: string[] | null } | null } | null;
  [key: string]: unknown;
}

const isFolderNode = (node?: TaggedTreeNode | null): boolean => node?.type === 'folder';

/** Trims, drops non-strings and empties, and de-duplicates while preserving order. */
export const normalizeTags = (tags: unknown): string[] => {
  if (!Array.isArray(tags)) return [];

  const normalized: string[] = [];
  for (const tag of tags) {
    if (typeof tag !== 'string') continue;
    const trimmed = tag.trim();
    if (trimmed.length && !normalized.includes(trimmed)) {
      normalized.push(trimmed);
    }
  }
  return normalized;
};

/** Tags a folder carries itself, draft-aware. */
export const getFolderTags = (folder?: TaggedTreeNode | null): string[] => {
  if (!folder) return [];
  return normalizeTags(folder.draft ? folder.draft.meta?.tags : folder.root?.meta?.tags);
};

/** Tags an item carries itself (no inheritance), draft-aware, for folders and requests alike. */
export const getOwnTags = (item?: TaggedTreeNode | null): string[] => {
  if (!item) return [];
  if (isFolderNode(item)) return getFolderTags(item);
  return normalizeTags(item.draft ? (item.draft.tags ?? item.tags) : item.tags);
};

export interface InheritedTagSource {
  tag: string;
  folder: TaggedTreeNode;
}

/** Tags an item inherits from the folders above it, paired with their source folder */
export const getInheritedTagSourcesFromTreePath = (
  treePath: (TaggedTreeNode | null | undefined)[] = []
): InheritedTagSource[] => {
  const sources: InheritedTagSource[] = [];

  for (const node of treePath.slice(0, -1)) {
    if (!isFolderNode(node)) continue;
    for (const tag of getFolderTags(node)) {
      if (!sources.some((source) => source.tag === tag)) {
        sources.push({ tag, folder: node as TaggedTreeNode });
      }
    }
  }
  return sources;
};

export const getInheritedTagsFromTreePath = (treePath: (TaggedTreeNode | null | undefined)[] = []): string[] =>
  getInheritedTagSourcesFromTreePath(treePath).map(({ tag }) => tag);

/** Own tags plus those cascaded from parent folders; a request cannot opt out of folder tags. */
export const getEffectiveTags = (
  ownTags: string[] | null | undefined,
  inheritedTags: string[] | null | undefined = []
): string[] => {
  const effective = normalizeTags(ownTags);
  for (const tag of normalizeTags(inheritedTags)) {
    if (!effective.includes(tag)) {
      effective.push(tag);
    }
  }
  return effective;
};

/**
 * Included if the request has at least one included tag and no excluded tag. Callers pass effective
 * tags (see `getEffectiveTags`), not just the request's own.
 */
export const isRequestTagsIncluded = (requestTags: string[], includeTags: string[], excludeTags: string[]) => {
  const shouldInclude = includeTags.length === 0 || requestTags.some((tag) => includeTags.includes(tag));
  const shouldExclude = excludeTags.length > 0 && requestTags.some((tag) => excludeTags.includes(tag));
  return shouldInclude && !shouldExclude;
};

export default isRequestTagsIncluded;
