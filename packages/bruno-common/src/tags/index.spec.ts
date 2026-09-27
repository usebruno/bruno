import { describe, it, expect } from '@jest/globals';
import isRequestTagsIncluded, {
  normalizeTags,
  getFolderTags,
  getSavedFolderTags,
  getOwnTags,
  getInheritedTagsFromTreePath,
  getInheritedTagSourcesFromTreePath,
  getEffectiveTags,
  type TaggedTreeNode
} from './index';

describe('isRequestTagsIncluded', () => {
  it('should include request when it has an included tag', () => {
    const requestTags = ['tag1', 'tag2'];
    const includeTags = ['tag1'];
    const excludeTags: string[] = [];
    const result = isRequestTagsIncluded(requestTags, includeTags, excludeTags);
    expect(result).toBe(true);
  });

  it('should include request when included tags is empty', () => {
    const requestTags = ['tag1', 'tag2'];
    const includeTags: string[] = [];
    const excludeTags: string[] = [];
    const result = isRequestTagsIncluded(requestTags, includeTags, excludeTags);
    expect(result).toBe(true);
  });

  it('should exclude request when it does not have an included tag', () => {
    const requestTags = ['tag1'];
    const includeTags = ['tag2'];
    const excludeTags: string[] = [];
    const result = isRequestTagsIncluded(requestTags, includeTags, excludeTags);
    expect(result).toBe(false);
  });

  it('should exclude request when it has an excluded tag', () => {
    const requestTags = ['tag1'];
    const includeTags: string[] = [];
    const excludeTags = ['tag1'];
    const result = isRequestTagsIncluded(requestTags, includeTags, excludeTags);
    expect(result).toBe(false);
  });

  it('should exclude request when it has both included and excluded tag', () => {
    const requestTags = ['tag1', 'tag2'];
    const includeTags: string[] = ['tag2'];
    const excludeTags = ['tag1'];
    const result = isRequestTagsIncluded(requestTags, includeTags, excludeTags);
    expect(result).toBe(false);
  });
});

describe('normalizeTags', () => {
  it('returns an empty list for anything that is not an array', () => {
    expect(normalizeTags(undefined)).toEqual([]);
    expect(normalizeTags(null)).toEqual([]);
    expect(normalizeTags('tag1')).toEqual([]);
    expect(normalizeTags({ 0: 'tag1' })).toEqual([]);
  });

  it('trims surrounding whitespace', () => {
    expect(normalizeTags([' tag1 ', '\ttag2\n'])).toEqual(['tag1', 'tag2']);
  });

  it('drops empty and whitespace-only tags', () => {
    expect(normalizeTags(['', '   ', 'tag1'])).toEqual(['tag1']);
  });

  it('drops entries that are not strings', () => {
    expect(normalizeTags(['tag1', 42, null, undefined, {}, ['tag2']])).toEqual(['tag1']);
  });

  it('de-duplicates after trimming while preserving first-seen order', () => {
    expect(normalizeTags(['tag2', 'tag1', ' tag2 ', 'tag1'])).toEqual(['tag2', 'tag1']);
  });
});

describe('getFolderTags', () => {
  it('returns an empty list when there is no folder', () => {
    expect(getFolderTags(undefined)).toEqual([]);
    expect(getFolderTags(null)).toEqual([]);
  });

  it('reads saved tags off root.meta.tags', () => {
    expect(getFolderTags({ type: 'folder', root: { meta: { tags: ['prod'] } } })).toEqual(['prod']);
  });

  it('returns nothing for a folder with no root file behind it', () => {
    expect(getFolderTags({ type: 'folder' })).toEqual([]);
    expect(getFolderTags({ type: 'folder', root: {} })).toEqual([]);
  });

  it('reads unsaved tags from draft.meta.tags when a draft exists', () => {
    const folder = { type: 'folder', root: { meta: { tags: ['saved'] } }, draft: { meta: { tags: ['unsaved'] } } };
    expect(getFolderTags(folder)).toEqual(['unsaved']);
  });

  it('returns nothing when a draft cleared every tag', () => {
    const saved = { type: 'folder', root: { meta: { tags: ['saved'] } } };
    expect(getFolderTags({ ...saved, draft: { meta: { tags: [] } } })).toEqual([]);
    expect(getFolderTags({ ...saved, draft: { meta: {} } })).toEqual([]);
    expect(getFolderTags({ ...saved, draft: {} })).toEqual([]);
  });

  it('normalizes whatever it reads', () => {
    expect(getFolderTags({ type: 'folder', root: { meta: { tags: [' prod ', 'prod', '', 7] } } } as any)).toEqual([
      'prod'
    ]);
  });
});

describe('getSavedFolderTags', () => {
  it('returns an empty list when there is no folder or no root file behind it', () => {
    expect(getSavedFolderTags(undefined)).toEqual([]);
    expect(getSavedFolderTags({ type: 'folder' })).toEqual([]);
  });

  it('reads root.meta.tags even when an unsaved draft says otherwise', () => {
    const folder = { type: 'folder', root: { meta: { tags: [' prod ', 'prod'] } }, draft: { meta: { tags: ['wip'] } } };
    expect(getSavedFolderTags(folder)).toEqual(['prod']);
  });
});

describe('getOwnTags', () => {
  it('returns an empty list when there is no item', () => {
    expect(getOwnTags(undefined)).toEqual([]);
    expect(getOwnTags(null)).toEqual([]);
  });

  it('reads a saved request tags', () => {
    expect(getOwnTags({ type: 'http-request', tags: ['prod'] })).toEqual(['prod']);
  });

  it('prefers the request draft tags over the saved ones', () => {
    const item = { type: 'http-request', tags: ['saved'], draft: { tags: ['unsaved'] } };
    expect(getOwnTags(item)).toEqual(['unsaved']);
  });

  it('falls back to the saved request tags when the draft mirrors nothing', () => {
    const item = { type: 'http-request', tags: ['saved'], draft: {} };
    expect(getOwnTags(item)).toEqual(['saved']);
  });

  it('honors a draft that cleared every request tag', () => {
    const item = { type: 'http-request', tags: ['saved'], draft: { tags: [] } };
    expect(getOwnTags(item)).toEqual([]);
  });

  it('resolves a folder through the folder rules', () => {
    expect(getOwnTags({ type: 'folder', root: { meta: { tags: ['prod'] } } })).toEqual(['prod']);
    expect(
      getOwnTags({ type: 'folder', root: { meta: { tags: ['saved'] } }, draft: { meta: { tags: ['unsaved'] } } })
    ).toEqual(['unsaved']);
  });

  it('never inherits - it only reports what the item itself carries', () => {
    expect(getOwnTags({ type: 'http-request' })).toEqual([]);
  });

  it('normalizes whatever it reads', () => {
    expect(getOwnTags({ type: 'http-request', tags: [' prod ', 'prod', ''] })).toEqual(['prod']);
  });
});

describe('getInheritedTagSourcesFromTreePath', () => {
  const folderNode = (name: string, tags: string[]): TaggedTreeNode => ({
    type: 'folder',
    name,
    root: { meta: { tags } }
  });

  it('returns nothing for an empty or missing tree path', () => {
    expect(getInheritedTagSourcesFromTreePath()).toEqual([]);
    expect(getInheritedTagSourcesFromTreePath([])).toEqual([]);
  });

  it('ignores the last node - an item does not inherit from itself', () => {
    const request = { type: 'http-request', name: 'req', tags: ['own'] };
    expect(getInheritedTagSourcesFromTreePath([request])).toEqual([]);

    const folder = folderNode('self', ['own']);
    expect(getInheritedTagSourcesFromTreePath([folder])).toEqual([]);
  });

  it('collects tags from every ancestor folder, pairing each with its source', () => {
    const outer = folderNode('outer', ['smoke']);
    const inner = folderNode('inner', ['prod']);
    const request = { type: 'http-request', name: 'req' };

    expect(getInheritedTagSourcesFromTreePath([outer, inner, request])).toEqual([
      { tag: 'smoke', folder: outer },
      { tag: 'prod', folder: inner }
    ]);
  });

  it('attributes a duplicated tag to the outermost folder that declares it', () => {
    const outer = folderNode('outer', ['prod']);
    const inner = folderNode('inner', ['prod']);
    const sources = getInheritedTagSourcesFromTreePath([outer, inner, { type: 'http-request' }]);

    expect(sources).toHaveLength(1);
    expect(sources[0].folder).toBe(outer);
  });

  it('skips non-folder and missing nodes along the path', () => {
    const outer = folderNode('outer', ['prod']);
    const path = [null, outer, undefined, { type: 'http-request', name: 'nested', tags: ['leaked'] }, { type: 'http-request' }];

    expect(getInheritedTagSourcesFromTreePath(path)).toEqual([{ tag: 'prod', folder: outer }]);
  });

  it('is draft-aware for the ancestor folders', () => {
    const outer: TaggedTreeNode = {
      type: 'folder',
      name: 'outer',
      root: { meta: { tags: ['saved'] } },
      draft: { meta: { tags: ['unsaved'] } }
    };

    expect(getInheritedTagSourcesFromTreePath([outer, { type: 'http-request' }])).toEqual([
      { tag: 'unsaved', folder: outer }
    ]);
  });

  it('excludes the collection root, which carries no folder type', () => {
    const collection = { name: 'collection', root: { meta: { tags: ['collection-level'] } } };
    const folder = folderNode('folder', ['prod']);

    expect(getInheritedTagSourcesFromTreePath([collection, folder, { type: 'http-request' }])).toEqual([
      { tag: 'prod', folder }
    ]);
  });
});

describe('getInheritedTagsFromTreePath', () => {
  it('returns nothing for an empty or missing tree path', () => {
    expect(getInheritedTagsFromTreePath()).toEqual([]);
    expect(getInheritedTagsFromTreePath([])).toEqual([]);
  });

  it('returns the ancestor tags, outermost first, de-duplicated', () => {
    const path = [
      { type: 'folder', name: 'outer', root: { meta: { tags: ['smoke', 'prod'] } } },
      { type: 'folder', name: 'inner', root: { meta: { tags: ['prod', 'v2'] } } },
      { type: 'http-request', name: 'req', tags: ['own'] }
    ];

    expect(getInheritedTagsFromTreePath(path)).toEqual(['smoke', 'prod', 'v2']);
  });
});

describe('getEffectiveTags', () => {
  it('returns an empty list when nothing is tagged', () => {
    expect(getEffectiveTags(undefined)).toEqual([]);
    expect(getEffectiveTags(null, null)).toEqual([]);
    expect(getEffectiveTags([], [])).toEqual([]);
  });

  it('returns the own tags when nothing is inherited', () => {
    expect(getEffectiveTags(['prod'])).toEqual(['prod']);
  });

  it('returns the inherited tags when the item carries none', () => {
    expect(getEffectiveTags([], ['prod'])).toEqual(['prod']);
  });

  it('appends inherited tags after the own ones', () => {
    expect(getEffectiveTags(['own'], ['inherited'])).toEqual(['own', 'inherited']);
  });

  it('keeps a tag once when it is both owned and inherited', () => {
    expect(getEffectiveTags(['prod', 'own'], ['prod', 'smoke'])).toEqual(['prod', 'own', 'smoke']);
  });

  it('normalizes both sides before merging', () => {
    expect(getEffectiveTags([' prod ', 'prod', ''], ['  prod', ' smoke '])).toEqual(['prod', 'smoke']);
  });

  it('does not mutate the arrays it is given', () => {
    const own = ['own'];
    const inherited = ['inherited'];
    getEffectiveTags(own, inherited);

    expect(own).toEqual(['own']);
    expect(inherited).toEqual(['inherited']);
  });
});
