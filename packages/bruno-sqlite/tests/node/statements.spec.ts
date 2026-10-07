import { DatabaseSync } from 'node:sqlite';
import type { StatementDef, StatementType } from '../../src/shared/types';

const defs: StatementDef[] = [
  { name: 'insertItem', type: 'exec', sql: 'INSERT INTO items(name) VALUES (:name)' },
  { name: 'insertWithId', type: 'exec', sql: 'INSERT INTO items(id, name) VALUES (:id, :name)' },
  { name: 'getItem', type: 'one', sql: 'SELECT * FROM items WHERE id = :id' },
  { name: 'allItems', type: 'many', sql: 'SELECT * FROM items' },
  { name: 'invalid', type: 'invalid_type' as StatementType, sql: 'SELECT * FROM items' },
  { name: 'unpreparable', type: 'one', sql: 'SELECT * FROM missing_table' }
];

jest.doMock('../../src/generated/node/statements', () => ({ statements: defs }));

const { Statements } = require('../../src/node/statements');

const newStatements = () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE items(id INTEGER PRIMARY KEY, name TEXT)');
  return new Statements(db);
};

let error: jest.SpyInstance;

beforeEach(() => {
  error = jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  error.mockRestore();
});

describe('Statements.execute', () => {
  it('returns the run result for a write', () => {
    const statements = newStatements();

    expect(statements.execute('insertItem', { name: 'alpha' })).toMatchObject({ changes: 1 });
  });

  it('returns a single row for a "one" read', () => {
    const statements = newStatements();
    statements.execute('insertItem', { name: 'alpha' });

    expect(statements.execute('getItem', { id: 1 })).toMatchObject({ name: 'alpha' });
  });

  it('returns every row for a "many" read', () => {
    const statements = newStatements();
    statements.execute('insertItem', { name: 'alpha' });

    expect(statements.execute('allItems', {})).toHaveLength(1);
  });

  it('throws when the write fails', () => {
    const statements = newStatements();
    statements.execute('insertWithId', { id: 1, name: 'alpha' });

    expect(() => statements.execute('insertWithId', { id: 1, name: 'dup' })).toThrow();
  });

  it('throws for an unknown statement', () => {
    const statements = newStatements();

    expect(() => statements.execute('nope', {})).toThrow('Unknown statement: "nope"');
  });

  // This is a very stretched test. The generator would already catch any types which are not valid
  it('throws for an unknown definition type', () => {
    const statements = newStatements();
    expect(() => statements.execute('invalid', {})).toThrow('unknown definition type: invalid_type');
  });
});

describe('Statements preparation', () => {
  it('discards only the statement that cannot be prepared', () => {
    const statements = newStatements();

    expect(statements._prepared.has('unpreparable')).toBe(false);
    expect(statements._prepared.size).toBe(defs.length - 1);
    expect(error).toHaveBeenCalledTimes(1);
  });

  it('keeps the healthy statements usable', () => {
    const statements = newStatements();

    statements.execute('insertItem', { name: 'alpha' });

    expect(statements.execute('allItems', {})).toEqual([{ id: 1, name: 'alpha' }]);
  });

  it('throws a distinct error when executing a discarded statement', () => {
    const statements = newStatements();

    expect(() => statements.execute('unpreparable', {})).toThrow(
      'Statement "unpreparable" could not be prepared against this database'
    );
  });
});
