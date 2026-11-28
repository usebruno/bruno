import { DEFAULT_OPEN_COLLECTION_PAGE, OPEN_COLLECTION_PAGE, OPEN_COLLECTION_SUB_PAGE } from 'utils/common/constants';
import { OPEN_COLLECTION_PAGES, findOpenCollectionPage } from './pages';

describe('open collection pages', () => {
  it('lists every menu page in the menu', () => {
    expect(OPEN_COLLECTION_PAGES.map(({ id }) => id).sort()).toEqual(Object.values(OPEN_COLLECTION_PAGE).sort());
  });

  it.each(Object.values(OPEN_COLLECTION_SUB_PAGE))('opens the sub page %s from a menu page', (pageId) => {
    const { parent } = findOpenCollectionPage(pageId);

    expect(findOpenCollectionPage(pageId).id).toBe(pageId);
    expect(Object.values(OPEN_COLLECTION_PAGE)).toContain(parent);
  });
});

describe('findOpenCollectionPage', () => {
  it.each([['an id it does not know', 'somewhere-else'], ['no id', null]])('gives the default page for %s', (_description, pageId) => {
    expect(findOpenCollectionPage(pageId).id).toBe(DEFAULT_OPEN_COLLECTION_PAGE);
  });
});
