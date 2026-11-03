import { IconBox, IconServer, IconCopy, IconEdit, IconFolder, IconX, IconTrash } from '@tabler/icons';
import { getApiSpecMenuItems } from './getApiSpecMenuItems';

jest.mock('utils/common/platform', () => ({ getRevealInFolderLabel: () => 'Reveal in Finder' }));

const ids = (items) => items.map((item) => item.id);
const itemById = (items, id) => items.find((item) => item.id === id);

describe('getApiSpecMenuItems', () => {
  const makeHandlers = () => ({
    'generate-collection': jest.fn(),
    'generate-mock-server': jest.fn(),
    'clone': jest.fn(),
    'rename': jest.fn(),
    'reveal': jest.fn(),
    'remove': jest.fn(),
    'delete': jest.fn()
  });

  const menu = (isMockServerEnabled, handlers = makeHandlers()) => getApiSpecMenuItems({ handlers, isMockServerEnabled });

  it('lists every action in design order with the divider before Remove', () => {
    expect(ids(menu(true))).toEqual([
      'generate-collection',
      'generate-mock-server',
      'clone',
      'rename',
      'reveal',
      'divider-1',
      'remove',
      'delete'
    ]);
  });

  it('hides Generate Mock Server when the beta flag is off', () => {
    expect(ids(menu(false))).not.toContain('generate-mock-server');
  });

  it('gives the divider no click handler', () => {
    expect(itemById(menu(true), 'divider-1')).toEqual({ id: 'divider-1', type: 'divider' });
  });

  it('uses the platform-aware reveal label', () => {
    expect(itemById(menu(false), 'reveal').label).toBe('Reveal in Finder');
  });

  it('marks Delete as a danger item', () => {
    expect(itemById(menu(false), 'delete').className).toBe('delete-item');
  });

  it.each([
    ['generate-collection', IconBox],
    ['generate-mock-server', IconServer],
    ['clone', IconCopy],
    ['rename', IconEdit],
    ['reveal', IconFolder],
    ['remove', IconX],
    ['delete', IconTrash]
  ])('%s shows its icon and calls only its own handler', (id, icon) => {
    const handlers = makeHandlers();
    const item = itemById(menu(true, handlers), id);

    item.onClick();

    expect(item.leftSection).toBe(icon);
    expect(item).not.toHaveProperty('requires');
    Object.entries(handlers).forEach(([name, handler]) => {
      expect(handler).toHaveBeenCalledTimes(name === id ? 1 : 0);
    });
  });
});
