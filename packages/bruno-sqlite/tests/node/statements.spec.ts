import { DatabaseSync } from 'node:sqlite';
import type { StatementDef } from '../../src/shared/types';

const defs: StatementDef[] = [
  { name: 'insertItem', type: 'exec', sql: 'INSERT INTO items(name) VALUES (:name)', tables: ['items'] },
  { name: 'insertWithId', type: 'exec', sql: 'INSERT INTO items(id, name) VALUES (:id, :name)', tables: ['items'] },
  { name: 'getItem', type: 'one', sql: 'SELECT * FROM items WHERE id = :id', tables: ['items'] },
  { name: 'allItems', type: 'many', sql: 'SELECT * FROM items', tables: ['items'] }
];

jest.doMock('../../src/generated/node/statements', () => ({ statements: defs }));

const { Statements } = require('../../src/node/statements');

const newStatements = (onMutation?: (event: unknown) => void) => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE items(id INTEGER PRIMARY KEY, name TEXT)');
  return new Statements(db, onMutation);
};

describe('Statements.execute mutation signalling', () => {
  it('notifies with the statement name and tables after a successful write', () => {
    const onMutation = jest.fn();
    const statements = newStatements(onMutation);

    const result = statements.execute('insertItem', { name: 'alpha' });

    expect(result).toMatchObject({ changes: 1 });
    expect(onMutation).toHaveBeenCalledTimes(1);
    expect(onMutation).toHaveBeenCalledWith({ name: 'insertItem', tables: ['items'] });
  });

  it('does not notify for a "one" read', () => {
    const onMutation = jest.fn();
    const statements = newStatements(onMutation);
    statements.execute('insertItem', { name: 'alpha' });
    onMutation.mockClear();

    expect(statements.execute('getItem', { id: 1 })).toMatchObject({ name: 'alpha' });
    expect(onMutation).not.toHaveBeenCalled();
  });

  it('does not notify for a "many" read', () => {
    const onMutation = jest.fn();
    const statements = newStatements(onMutation);
    statements.execute('insertItem', { name: 'alpha' });
    onMutation.mockClear();

    expect(statements.execute('allItems', {})).toHaveLength(1);
    expect(onMutation).not.toHaveBeenCalled();
  });

  it('does not notify when the write throws', () => {
    const onMutation = jest.fn();
    const statements = newStatements(onMutation);
    statements.execute('insertWithId', { id: 1, name: 'alpha' });
    onMutation.mockClear();

    expect(() => statements.execute('insertWithId', { id: 1, name: 'dup' })).toThrow();
    expect(onMutation).not.toHaveBeenCalled();
  });

  it('throws for an unknown statement without notifying', () => {
    const onMutation = jest.fn();
    const statements = newStatements(onMutation);

    expect(() => statements.execute('nope', {})).toThrow('Unknown statement: "nope"');
    expect(onMutation).not.toHaveBeenCalled();
  });
});
