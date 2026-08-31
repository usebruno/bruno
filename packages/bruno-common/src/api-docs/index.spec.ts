import { describe, it, expect, jest } from '@jest/globals';
import {
  filterRequestItemsByTags,
  selectEnvironmentsByName,
  buildApiDocsHtml,
  generateApiDocsHtml,
  getApiDocsFileName,
  stripGitCredentials
} from './index';

const req = (name: string, tags?: string[]) => ({ name, type: 'http-request', tags });
const folder = (name: string, items: any[]) => ({ name, type: 'folder', items });

describe('filterRequestItemsByTags', () => {
  it('returns the items unchanged when no tags are given', () => {
    const items = [req('a', ['x']), folder('empty', [])];
    expect(filterRequestItemsByTags(items, [], [])).toBe(items);
  });

  it('keeps only requests carrying an included tag', () => {
    const result = filterRequestItemsByTags([req('a', ['prod']), req('b', ['wip'])], ['prod'], []);
    expect(result.map((i) => i.name)).toEqual(['a']);
  });

  it('drops requests carrying an excluded tag (exclude wins over include)', () => {
    const result = filterRequestItemsByTags([req('a', ['prod']), req('b', ['prod', 'wip'])], ['prod'], ['wip']);
    expect(result.map((i) => i.name)).toEqual(['a']);
  });

  it('prunes folders left empty by filtering and recurses into surviving ones', () => {
    const items = [folder('gone', [req('a', ['wip'])]), folder('kept', [req('b', ['prod']), req('c', ['wip'])])];
    const result = filterRequestItemsByTags(items, ['prod'], []);
    expect(result.map((i) => i.name)).toEqual(['kept']);
    expect((result[0].items as any[]).map((i) => i.name)).toEqual(['b']);
  });

  it('never drops non-request leaves (scripts) by tag rules', () => {
    const result = filterRequestItemsByTags([{ name: 's', type: 'js' }, req('a', ['wip'])], ['prod'], []);
    expect(result.map((i) => i.name)).toEqual(['s']);
  });

  it('prunes a pre-existing empty folder (no items array) when filtering', () => {
    const result = filterRequestItemsByTags([{ name: 'Archive', type: 'folder' }, req('a', ['prod'])], ['prod'], []);
    expect(result.map((i) => i.name)).toEqual(['a']);
  });
});

describe('selectEnvironmentsByName', () => {
  const envs = [{ name: 'Prod' }, { name: 'Dev' }, { name: 'QA' }];

  it('keeps only the included environments', () => {
    expect(selectEnvironmentsByName(envs, ['Prod', 'QA'], []).map((e) => e.name)).toEqual(['Prod', 'QA']);
  });

  it('removes excluded environments', () => {
    expect(selectEnvironmentsByName(envs, ['Prod', 'Dev'], ['Dev']).map((e) => e.name)).toEqual(['Prod']);
  });

  it('selects none when the include list is empty', () => {
    expect(selectEnvironmentsByName(envs, [], [])).toEqual([]);
  });
});

describe('buildApiDocsHtml', () => {
  it('omits gitCollectionUrl when not provided and embeds the collection data', () => {
    const html = buildApiDocsHtml('My API', '"data"');
    expect(html).not.toContain('gitCollectionUrl');
    expect(html).toContain('const collectionData = "data";');
    expect(html).toContain('https://cdn.usebruno.com/api-docs/api-docs.js');
  });

  it('embeds gitCollectionUrl when provided', () => {
    const html = buildApiDocsHtml('My API', '"data"', { gitCollectionUrl: 'https://git/x.git' });
    expect(html).toContain('gitCollectionUrl: "https://git/x.git"');
  });

  it('escapes the collection name in the document title', () => {
    const html = buildApiDocsHtml('<b>&"', '"data"');
    expect(html).toContain('<title>&lt;b&gt;&amp;&quot; - API Documentation</title>');
  });

  it('honors a custom renderer base url', () => {
    const html = buildApiDocsHtml('X', '"d"', { rendererBaseUrl: 'https://cdn.example.com' });
    expect(html).toContain('https://cdn.example.com/api-docs/api-docs.css');
  });
});

describe('stripGitCredentials', () => {
  it('removes a token from an https url', () => {
    expect(stripGitCredentials('https://ghp_xxx@github.com/org/repo.git')).toBe('https://github.com/org/repo.git');
  });

  it('removes a user:password pair from an https url', () => {
    expect(stripGitCredentials('https://user:pass@github.com/org/repo.git')).toBe('https://github.com/org/repo.git');
    expect(stripGitCredentials('https://ghp_x:x-oauth-basic@github.com/org/repo.git')).toBe('https://github.com/org/repo.git');
  });

  it('leaves a credential-free https url unchanged', () => {
    expect(stripGitCredentials('https://github.com/org/repo.git')).toBe('https://github.com/org/repo.git');
  });

  it('preserves the port and path while stripping credentials', () => {
    expect(stripGitCredentials('http://token@host:8443/org/repo.git')).toBe('http://host:8443/org/repo.git');
  });

  it('leaves ssh remotes untouched (git@ is the ssh user, not a secret)', () => {
    expect(stripGitCredentials('git@github.com:org/repo.git')).toBe('git@github.com:org/repo.git');
    expect(stripGitCredentials('ssh://git@github.com/org/repo.git')).toBe('ssh://git@github.com/org/repo.git');
  });
});

describe('generateApiDocsHtml', () => {
  const makeDeps = (overrides: Record<string, unknown> = {}) => ({
    brunoToOpenCollection: jest.fn((c: any) => ({ info: { name: c.name || 'X' }, items: c.items })),
    dumpYaml: jest.fn((obj: unknown) => JSON.stringify(obj)),
    escapeString: jest.fn((s: string) => JSON.stringify(s)),
    ...overrides
  });

  it('filters requests by tag before conversion', () => {
    const deps = makeDeps();
    const collection = { name: 'C', items: [req('a', ['prod']), req('b', ['wip'])] };
    generateApiDocsHtml(collection, { tags: { include: ['prod'] } }, deps as any);
    const converted = deps.brunoToOpenCollection.mock.calls[0][0];
    expect(converted.items.map((i: any) => i.name)).toEqual(['a']);
  });

  it('scopes environments by name when requested', () => {
    const deps = makeDeps();
    const collection = { name: 'C', items: [], environments: [{ name: 'Prod' }, { name: 'Dev' }] };
    generateApiDocsHtml(collection, { environments: { include: ['Prod'] } }, deps as any);
    const converted = deps.brunoToOpenCollection.mock.calls[0][0];
    expect(converted.environments.map((e: any) => e.name)).toEqual(['Prod']);
  });

  it('serializes with fixed options and hardens closing tags in the embedded data', () => {
    const deps = makeDeps({ escapeString: jest.fn(() => '"a</script>b"') });
    const html = generateApiDocsHtml({ name: 'C', items: [] }, {}, deps as any);
    expect(deps.dumpYaml).toHaveBeenCalledWith(expect.anything(), {
      indent: 2,
      lineWidth: -1,
      noRefs: true,
      sortKeys: false
    });
    expect(html).toContain('"a<\\/script>b"');
  });

  it('neutralizes an HTML comment opener in the embedded data so it cannot flip script parsing', () => {
    const deps = makeDeps({ escapeString: jest.fn(() => '"a<!--<script>b"') });
    const html = generateApiDocsHtml({ name: 'C', items: [] }, {}, deps as any);
    expect(html).not.toContain('<!--');
    expect(html).toContain('<\\!--');
  });

  it('augments version and export metadata on the open collection', () => {
    const deps = makeDeps();
    generateApiDocsHtml(
      { name: 'C', items: [] },
      { collectionVersion: '2.0.0', exportedAt: 'T', exportedUsing: 'Bruno/1' },
      deps as any
    );
    const openCollection = deps.dumpYaml.mock.calls[0][0] as any;
    expect(openCollection.info.version).toBe('2.0.0');
    expect(openCollection.extensions.bruno).toEqual({ exportedAt: 'T', exportedUsing: 'Bruno/1' });
  });

  it('drops a converter-derived version when no collectionVersion is provided (bru schema marker "1")', () => {
    const deps = makeDeps({
      brunoToOpenCollection: jest.fn((c: any) => ({ info: { name: c.name || 'X', version: '1' }, items: c.items }))
    });
    generateApiDocsHtml({ name: 'C', items: [] }, { collectionVersion: '' }, deps as any);
    const openCollection = deps.dumpYaml.mock.calls[0][0] as any;
    expect(openCollection.info.version).toBeUndefined();
    expect(openCollection.info.name).toBe('C');
  });

  it('overrides a converter-derived version with the provided collectionVersion', () => {
    const deps = makeDeps({
      brunoToOpenCollection: jest.fn((c: any) => ({ info: { name: c.name || 'X', version: '1' }, items: c.items }))
    });
    generateApiDocsHtml({ name: 'C', items: [] }, { collectionVersion: '3.1' }, deps as any);
    const openCollection = deps.dumpYaml.mock.calls[0][0] as any;
    expect(openCollection.info.version).toBe('3.1');
  });

  it('embeds the git link only when provided', () => {
    const deps = makeDeps();
    expect(generateApiDocsHtml({ name: 'C', items: [] }, {}, deps as any)).not.toContain('gitCollectionUrl');
    expect(
      generateApiDocsHtml({ name: 'C', items: [] }, { gitCollectionUrl: 'https://g/x.git' }, deps as any)
    ).toContain('gitCollectionUrl: "https://g/x.git"');
  });

  it('strips credentials from the embedded git link so a token cannot leak into the docs', () => {
    const deps = makeDeps();
    const tokenized = 'https://ghp_0123456789abcdefghijklmnopqrstuvwxyz@github.com/org/repo.git';
    const html = generateApiDocsHtml({ name: 'C', items: [] }, { gitCollectionUrl: tokenized }, deps as any);
    expect(html).not.toContain('ghp_0123456789abcdefghijklmnopqrstuvwxyz');
    expect(html).toContain('gitCollectionUrl: "https://github.com/org/repo.git"');
  });

  it('hardens a closing script tag in the embedded git link', () => {
    const deps = makeDeps();
    const url = 'https://example.com/a</script><script>alert(1)</script>';
    const html = generateApiDocsHtml({ name: 'C', items: [] }, { gitCollectionUrl: url }, deps as any);
    expect(html).not.toContain('</script><script>');
    expect(html).toContain('<\\/script>');
  });

  it('neutralizes an HTML comment opener in the embedded git link', () => {
    const deps = makeDeps();
    const url = 'https://example.com/a<!--<script>';
    const html = generateApiDocsHtml({ name: 'C', items: [] }, { gitCollectionUrl: url }, deps as any);
    expect(html).not.toContain('<!--');
  });
});

describe('getApiDocsFileName', () => {
  it('appends the documentation suffix and keeps inner spaces', () => {
    expect(getApiDocsFileName('My API')).toBe('My API-documentation.html');
  });

  it('strips a leading dot so the output is not a hidden file', () => {
    expect(getApiDocsFileName('.internal-api')).toBe('internal-api-documentation.html');
  });

  it('replaces filesystem-unsafe characters with hyphens', () => {
    expect(getApiDocsFileName('a/b:c')).toBe('a-b-c-documentation.html');
  });

  it('falls back to "collection" when the name sanitizes away', () => {
    expect(getApiDocsFileName('')).toBe('collection-documentation.html');
    expect(getApiDocsFileName('   ')).toBe('collection-documentation.html');
    expect(getApiDocsFileName(null)).toBe('collection-documentation.html');
  });
});
