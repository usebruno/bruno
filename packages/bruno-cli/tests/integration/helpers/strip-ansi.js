// Strips ANSI color codes so output stays checkable regardless of the shell's color setting.

const stripAnsi = (text) => text.replace(/\x1b\[[0-9;]*m/g, '');

module.exports = { stripAnsi };
