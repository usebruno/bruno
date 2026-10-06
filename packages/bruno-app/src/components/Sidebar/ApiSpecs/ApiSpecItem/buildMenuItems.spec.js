import { IconBox, IconServer, IconFolder, IconX, IconTrash } from '@tabler/icons';
import { buildMenuItems } from './buildMenuItems';

jest.mock('utils/common/platform', () => ({ getRevealInFolderLabel: () => 'Reveal in Finder' }));

const ids = (items) => items.map((item) => item.id);
const itemById = (items, id) => items.find((item) => item.id === id);

describe('buildMenuItems', () => {
  const makeHandlers = () => ({
    onGenerateCollection: jest.fn(),
    onGenerateMockServer: jest.fn(),
    onReveal: jest.fn(),
    onRemove: jest.fn(),
    onDelete: jest.fn()
  });

  it('lists every action in design order with the divider before Remove', () => {
    expect(ids(buildMenuItems({ isMockServerEnabled: true, ...makeHandlers() }))).toEqual([
      'generate-collection',
      'generate-mock-server',
      'reveal',
      'divider-1',
      'remove',
      'delete'
    ]);
  });

  it('hides Generate Mock Server when the beta flag is off', () => {
    expect(ids(buildMenuItems({ isMockServerEnabled: false, ...makeHandlers() }))).not.toContain('generate-mock-server');
  });

  it('uses the platform-aware reveal label', () => {
    expect(itemById(buildMenuItems({ isMockServerEnabled: false, ...makeHandlers() }), 'reveal').label).toBe('Reveal in Finder');
  });

  it('marks Delete as a danger item', () => {
    expect(itemById(buildMenuItems({ isMockServerEnabled: false, ...makeHandlers() }), 'delete').className).toBe('delete-item');
  });

  it.each([
    ['generate-collection', 'onGenerateCollection', IconBox],
    ['generate-mock-server', 'onGenerateMockServer', IconServer],
    ['reveal', 'onReveal', IconFolder],
    ['remove', 'onRemove', IconX],
    ['delete', 'onDelete', IconTrash]
  ])('%s shows its icon and calls only its own handler', (id, handlerName, icon) => {
    const handlers = makeHandlers();
    const item = itemById(buildMenuItems({ isMockServerEnabled: true, ...handlers }), id);

    item.onClick();

    expect(item.leftSection).toBe(icon);
    Object.entries(handlers).forEach(([name, handler]) => {
      expect(handler).toHaveBeenCalledTimes(name === handlerName ? 1 : 0);
    });
  });
});
