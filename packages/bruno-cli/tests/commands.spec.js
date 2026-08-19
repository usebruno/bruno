const fs = require('fs');
const path = require('path');

const { COMMANDS } = require('../src/command-registry');

// The registry spells out each command's `command` and `desc` instead of reading them from the module,
// so these tests are what keeps the two in step.

const COMMANDS_DIR = path.join(__dirname, '../src/commands');

describe('command registration', () => {
  const moduleNames = fs
    .readdirSync(COMMANDS_DIR)
    .filter((f) => f.endsWith('.js') && !f.endsWith('.spec.js'))
    .map((f) => path.basename(f, '.js'))
    .sort();

  it('registers every module in src/commands', () => {
    expect(COMMANDS.map((c) => c.name).sort()).toEqual(moduleNames);
  });

  it('lists commands alphabetically, so help output has a stable order', () => {
    const names = COMMANDS.map((c) => c.name);
    expect(names).toEqual([...names].sort());
  });

  it.each(COMMANDS.map((c) => c.name))('mirrors the command and desc exported by %s.js', (name) => {
    const entry = COMMANDS.find((c) => c.name === name);
    const mod = require(path.join(COMMANDS_DIR, name));

    expect(entry.command).toBe(mod.command);
    expect(entry.desc).toBe(mod.desc);
  });

  it('exposes a builder and handler on every command module', () => {
    for (const { name } of COMMANDS) {
      const mod = require(path.join(COMMANDS_DIR, name));
      expect(typeof mod.builder).toBe('function');
      expect(typeof mod.handler).toBe('function');
    }
  });
});
