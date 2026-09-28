import { parseStatementFile } from '../../scripts/lib/sources';

const statement = (annotation: string) => `${annotation}\nSELECT id FROM items;`;

describe('statement annotation flags', () => {
  it('defaults both flags to false when none are given', () => {
    const [def] = parseStatementFile('items.sql', statement('-- name: get_item :one'));

    expect(def).toMatchObject({ name: 'get_item', type: 'one', readBigInts: false, main: false });
  });

  it('marks a statement main-only', () => {
    const [def] = parseStatementFile('items.sql', statement('-- name: get_item :one :main'));

    expect(def.main).toBe(true);
    expect(def.readBigInts).toBe(false);
  });

  it('accepts the flags in either order', () => {
    const [first] = parseStatementFile('items.sql', statement('-- name: get_item :one :main :bigints'));
    const [second] = parseStatementFile('items.sql', statement('-- name: get_item :one :bigints :main'));

    expect(first).toMatchObject({ main: true, readBigInts: true });
    expect(second).toMatchObject({ main: true, readBigInts: true });
  });

  it('rejects an unknown flag rather than silently leaving the statement renderer-callable', () => {
    expect(() => parseStatementFile('items.sql', statement('-- name: get_item :one :mian'))).toThrow(
      'uses unsupported flag ":mian"'
    );
  });

  it('still rejects an unsupported command', () => {
    expect(() => parseStatementFile('items.sql', statement('-- name: get_item :single'))).toThrow(
      'uses unsupported command ":single"'
    );
  });
});
