import { buildMenuItems } from './buildMenuItems';

jest.mock('utils/common/platform', () => ({ getRevealInFolderLabel: () => 'Reveal in Finder' }));

const ids = (items) => items.map((item) => item.id);

describe('buildMenuItems', () => {
  const handlers = {
    onGenerateCollection: jest.fn(),
    onGenerateMockServer: jest.fn(),
    onClone: jest.fn(),
    onRename: jest.fn(),
    onReveal: jest.fn(),
    onRemove: jest.fn(),
    onDelete: jest.fn()
  };

  it('lists every action in design order with the divider before Remove', () => {
    expect(ids(buildMenuItems({ isMockServerEnabled: true, ...handlers }))).toEqual([
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
    expect(ids(buildMenuItems({ isMockServerEnabled: false, ...handlers }))).not.toContain('generate-mock-server');
  });

  it('uses the platform-aware reveal label', () => {
    const reveal = buildMenuItems({ isMockServerEnabled: false, ...handlers }).find((item) => item.id === 'reveal');
    expect(reveal.label).toBe('Reveal in Finder');
  });

  it('marks Delete as a danger item', () => {
    const del = buildMenuItems({ isMockServerEnabled: false, ...handlers }).find((item) => item.id === 'delete');
    expect(del.className).toBe('delete-item');
  });

  it('wires every action to its handler', () => {
    const items = buildMenuItems({ isMockServerEnabled: true, ...handlers });
    items.filter((item) => item.type !== 'divider').forEach((item) => item.onClick());
    Object.values(handlers).forEach((handler) => expect(handler).toHaveBeenCalledTimes(1));
  });

  it('gives every action a real icon component', () => {
    const items = buildMenuItems({ isMockServerEnabled: true, ...handlers });
    items.filter((item) => item.type !== 'divider').forEach((item) => expect(typeof item.leftSection).toBe('function'));
  });

  it('enables every action', () => {
    const items = buildMenuItems({ isMockServerEnabled: true, ...handlers });
    expect(items.filter((item) => item.disabled)).toEqual([]);
  });
});
