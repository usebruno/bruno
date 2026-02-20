#!/usr/bin/env node

/**
 * Hard-resets Bruno's state so the Welcome Modal appears again on a clean slate.
 *
 * What it does:
 *   1. Deletes preferences.json entirely
 *   2. Deletes Local Storage (clears bruno.welcomeModalDismissed, theme, etc.)
 *   3. Deletes default-workspace directories
 *   4. Deletes sample collections from the filesystem
 *
 * Usage:
 *   node scripts/reset-welcome-state.js
 *
 * NOTE: Bruno must be fully closed before running this script.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

// ── Resolve userData path (same logic Electron uses) ──
const platform = process.platform;
let userDataDir;

if (platform === 'darwin') {
  userDataDir = path.join(os.homedir(), 'Library', 'Application Support', 'Bruno');
} else if (platform === 'win32') {
  userDataDir = path.join(process.env.APPDATA || path.join(os.homedir(), 'AppData', 'Roaming'), 'Bruno');
} else {
  userDataDir = path.join(process.env.XDG_CONFIG_HOME || path.join(os.homedir(), '.config'), 'Bruno');
}

console.log(`Bruno userData dir: ${userDataDir}\n`);

if (!fs.existsSync(userDataDir)) {
  console.error('ERROR: userData directory not found. Is Bruno installed?');
  process.exit(1);
}

function rm(target, label) {
  if (!fs.existsSync(target)) {
    console.log(`[--] ${label} — not found, skipping`);
    return;
  }
  try {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`[OK] ${label} — deleted`);
  } catch (err) {
    console.error(`[!!] ${label} — failed: ${err.message}`);
  }
}

// ── 1. Delete preferences.json ──
rm(path.join(userDataDir, 'preferences.json'), 'preferences.json');

// ── 2. Delete Local Storage (localStorage with welcomeModalDismissed, theme, etc.) ──
rm(path.join(userDataDir, 'Local Storage'), 'Local Storage');

// ── 3. Delete Session Storage ──
rm(path.join(userDataDir, 'Session Storage'), 'Session Storage');

// ── 4. Delete default-workspace directories ──
try {
  const entries = fs.readdirSync(userDataDir);
  const workspaceDirs = entries.filter((e) => e.startsWith('default-workspace'));
  if (workspaceDirs.length === 0) {
    console.log('[--] default-workspace — not found, skipping');
  }
  for (const dir of workspaceDirs) {
    rm(path.join(userDataDir, dir), dir);
  }
} catch (err) {
  console.error(`[!!] Failed to scan for default-workspace dirs: ${err.message}`);
}

// ── 5. Delete sample collections + bruno-data from filesystem ──
const home = os.homedir();
const documentsDir = path.join(home, 'Documents');

if (fs.existsSync(documentsDir)) {
  try {
    const entries = fs.readdirSync(documentsDir);

    // Delete "Sample API Collection*" folders
    const sampleDirs = entries.filter((e) => e.startsWith('Sample API Collection'));
    for (const dir of sampleDirs) {
      rm(path.join(documentsDir, dir), `~/Documents/${dir}`);
    }

    // Delete bruno-data folder
    const brunoDataDir = path.join(documentsDir, 'bruno-data');
    if (fs.existsSync(brunoDataDir)) {
      rm(brunoDataDir, '~/Documents/bruno-data');
    }
  } catch (err) {
    console.error(`[!!] Failed to scan ~/Documents: ${err.message}`);
  }
}

console.log('\nDone! Launch Bruno to see the Welcome Modal on a clean slate.\n');
