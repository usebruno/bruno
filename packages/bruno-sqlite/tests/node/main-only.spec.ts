import { DatabaseSync } from 'node:sqlite';
import type { StatementDef } from '../../src/shared/types';

const defs: StatementDef[] = [
  { name: 'getItem', type: 'one', sql: 'SELECT * FROM items WHERE id = :id', tables: ['items'] },
  { name: 'insertItem', type: 'exec', sql: 'INSERT INTO items(name) VALUES (:name)', tables: ['items'], main: true }
];

jest.doMock('../../src/generated/node/statements', () => ({ statements: defs }));

const { Statements } = require('../../src/node/statements');
const { registerSQLiteIpc } = require('../../src/node/ipc');
const { SQLITE_CHANNEL } = require('../../src/shared/ipc');

const newStatements = () => {
  const db = new DatabaseSync(':memory:');
  db.exec('CREATE TABLE items(id INTEGER PRIMARY KEY, name TEXT)');
  return new Statements(db);
};

const newIpcMain = () => {
  const handlers = new Map<string, (event: unknown, request: unknown) => unknown>();
  return {
    handle: (channel: string, listener: (event: unknown, request: unknown) => unknown) => {
      handlers.set(channel, listener);
    },
    invoke: (channel: string, request: unknown) => handlers.get(channel)!({}, request)
  };
};

describe('Statements.isMainOnly', () => {
  it('reports the flag from the statement definition', () => {
    const statements = newStatements();

    expect(statements.isMainOnly('insertItem')).toBe(true);
    expect(statements.isMainOnly('getItem')).toBe(false);
  });

  it('reports false for an unknown statement so execute owns that error', () => {
    const statements = newStatements();

    expect(statements.isMainOnly('nope')).toBe(false);
  });
});

describe('registerSQLiteIpc main-only rejection', () => {
  it('refuses a main-only statement sent from the renderer', () => {
    const statements = newStatements();
    const ipcMain = newIpcMain();
    registerSQLiteIpc(ipcMain, statements);

    expect(() => ipcMain.invoke(SQLITE_CHANNEL, { name: 'insertItem', params: { name: 'alpha' } })).toThrow(
      'Statement "insertItem" is not callable from the renderer'
    );
  });

  it('does not run the statement it refused', () => {
    const statements = newStatements();
    const ipcMain = newIpcMain();
    registerSQLiteIpc(ipcMain, statements);

    expect(() => ipcMain.invoke(SQLITE_CHANNEL, { name: 'insertItem', params: { name: 'alpha' } })).toThrow();

    expect(statements.execute('getItem', { id: 1 })).toBeUndefined();
  });

  it('still serves a statement that is not main-only', () => {
    const statements = newStatements();
    statements.execute('insertItem', { name: 'alpha' });
    const ipcMain = newIpcMain();
    registerSQLiteIpc(ipcMain, statements);

    expect(ipcMain.invoke(SQLITE_CHANNEL, { name: 'getItem', params: { id: 1 } })).toMatchObject({ name: 'alpha' });
  });
});
