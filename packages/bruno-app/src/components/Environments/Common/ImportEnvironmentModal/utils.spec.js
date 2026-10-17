import { coerceEnvColor, coerceEnvName } from 'utils/environments';
import {
  buildReviewItems,
  ENV_STATUS,
  initialResolutions,
  initialSelection,
  RESOLUTION_TYPES
} from './utils';

describe('coerceEnvName', () => {
  it.each([
    ['a plain name', 'dev', 'dev'],
    ['an integer', 123, '123'],
    ['zero', 0, '0'],
    ['a negative number', -1, '-1'],
    ['a decimal', 1.5, '1.5']
  ])('reads %s as text', (_label, name, expected) => {
    expect(coerceEnvName(name)).toBe(expected);
  });

  it.each([
    ['an empty string', ''],
    ['whitespace only', '   '],
    ['undefined', undefined],
    ['null', null],
    ['a boolean', true],
    ['an object', {}],
    ['an array', ['dev']],
    ['NaN', NaN],
    ['Infinity', Infinity]
  ])('has no usable name for %s', (_label, name) => {
    expect(coerceEnvName(name)).toBeNull();
  });
});

describe('coerceEnvColor', () => {
  it.each([
    ['a hex colour', '#CE4F3B'],
    ['a short hex', '#fff'],
    ['a named colour', 'red'],
    ['an rgb colour', 'rgb(1, 2, 3)'],
    ['an rgba colour', 'rgba(1, 2, 3, 0.5)'],
    ['an hsl colour', 'hsl(120, 50%, 50%)']
  ])('keeps %s', (_label, color) => {
    expect(coerceEnvColor(color)).toBe(color);
  });

  it.each([
    ['a word that is not a colour', 'notacolor'],
    ['a truncated hex', '#12345'],
    ['a value carrying a css injection', 'blue;background:url(x)'],
    ['an empty string', ''],
    ['whitespace only', '   '],
    ['a number', 123],
    ['an object', {}],
    ['null', null],
    ['undefined', undefined]
  ])('drops %s', (_label, color) => {
    expect(coerceEnvColor(color)).toBeUndefined();
  });
});

describe('buildReviewItems', () => {
  const env = (name, extra = {}) => ({ name, fileName: `${name}.json`, ...extra });

  it('marks an environment whose name is free as new', () => {
    const [item] = buildReviewItems({ valid: [env('dev')], existingNames: ['prod'] });

    expect(item).toMatchObject({ name: 'dev', status: ENV_STATUS.NEW, id: 'env-0' });
  });

  it('marks an environment whose name is taken as a duplicate, ignoring case and padding', () => {
    const [item] = buildReviewItems({ valid: [env('  DEV  ')], existingNames: ['dev'] });

    expect(item.status).toBe(ENV_STATUS.DUPLICATE);
  });

  it('puts importable rows before failed ones and gives every row a distinct id', () => {
    const items = buildReviewItems({
      valid: [env('dev'), env('prod')],
      invalid: [{ fileName: 'broken.json', error: 'Unable to parse JSON' }],
      existingNames: []
    });

    expect(items.map((item) => [item.id, item.status])).toEqual([
      ['env-0', ENV_STATUS.NEW],
      ['env-1', ENV_STATUS.NEW],
      ['env-2', ENV_STATUS.INVALID]
    ]);
    expect(new Set(items.map((item) => item.id)).size).toBe(items.length);
  });

  it('demotes an environment whose name never went through coercion', () => {
    const items = buildReviewItems({ valid: [env('dev'), { name: 123, fileName: 'odd.json' }], existingNames: [] });

    expect(items.map((item) => item.status)).toEqual([ENV_STATUS.NEW, ENV_STATUS.INVALID]);
    expect(items[1]).toMatchObject({ fileName: 'odd.json', error: 'Could not be read' });
  });

  it('survives a null entry among the importable environments', () => {
    const items = buildReviewItems({ valid: [env('dev'), null, env('prod')], existingNames: [] });

    expect(items.map((item) => item.status)).toEqual([ENV_STATUS.NEW, ENV_STATUS.NEW, ENV_STATUS.INVALID]);
    expect(items[2]).toMatchObject({ fileName: 'Unknown', error: 'Could not be read' });
  });

  it('survives a null entry among the failures, which sits outside the loop', () => {
    const items = buildReviewItems({ valid: [env('dev')], invalid: [null], existingNames: [] });

    expect(items.map((item) => item.status)).toEqual([ENV_STATUS.NEW, ENV_STATUS.INVALID]);
    expect(items[1]).toMatchObject({ fileName: 'Unknown' });
  });

  it('survives an environment that throws while being classified', () => {
    const exploding = { fileName: 'boom.json', get name() { throw new Error('boom'); } };
    const items = buildReviewItems({ valid: [exploding, env('prod')], existingNames: [] });

    expect(items.map((item) => item.status)).toEqual([ENV_STATUS.NEW, ENV_STATUS.INVALID]);
    expect(items[1]).toMatchObject({ fileName: 'boom.json', error: 'Could not be read' });
  });

  it('returns nothing for an empty import', () => {
    expect(buildReviewItems({})).toEqual([]);
  });
});

describe('initialSelection / initialResolutions', () => {
  const items = [
    { id: 'env-0', status: ENV_STATUS.NEW },
    { id: 'env-1', status: ENV_STATUS.DUPLICATE },
    { id: 'env-2', status: ENV_STATUS.INVALID }
  ];

  it('ticks everything importable and nothing that failed', () => {
    expect([...initialSelection(items)]).toEqual(['env-0', 'env-1']);
  });

  it('defaults every conflict to landing as a new environment', () => {
    expect([...initialResolutions(items)]).toEqual([['env-1', RESOLUTION_TYPES.CREATE_NEW]]);
  });
});
