import { readDroppedItems } from './dropped-items';

const folderItem = (path) => ({ kind: 'file', webkitGetAsEntry: () => ({ isDirectory: true }), getAsFile: () => ({ path }) });
const fileItem = (path) => ({ kind: 'file', webkitGetAsEntry: () => ({ isDirectory: false }), getAsFile: () => ({ path }) });
const textItem = () => ({ kind: 'string', webkitGetAsEntry: () => null, getAsFile: () => null });

const read = (...items) => readDroppedItems({ items }, (file) => file.path);

describe('readDroppedItems', () => {
  it('returns the paths of dropped folders', () => {
    expect(read(folderItem('/work/api'), folderItem('/work/billing'))).toEqual({
      folderPaths: ['/work/api', '/work/billing'],
      hasFolders: true,
      fileCount: 0
    });
  });

  it('counts dropped files, including a collection config file', () => {
    expect(read(fileItem('/work/openapi.yaml'), fileItem('/work/api/bruno.json'))).toEqual({
      folderPaths: [],
      hasFolders: false,
      fileCount: 2
    });
  });

  it('separates folders from files in a mixed drop', () => {
    expect(read(folderItem('/work/api'), fileItem('/work/openapi.yaml'))).toEqual({
      folderPaths: ['/work/api'],
      hasFolders: true,
      fileCount: 1
    });
  });

  it('notes the folders even when none of their paths can be read', () => {
    expect(read(folderItem(''))).toEqual({ folderPaths: [], hasFolders: true, fileCount: 0 });
  });

  it('counts an item with no entry as a file', () => {
    const item = { kind: 'file', webkitGetAsEntry: () => null, getAsFile: () => ({ path: '/work/a' }) };

    expect(read(item)).toEqual({ folderPaths: [], hasFolders: false, fileCount: 1 });
  });

  it('ignores dragged text', () => {
    expect(read(textItem())).toEqual({ folderPaths: [], hasFolders: false, fileCount: 0 });
  });
});
