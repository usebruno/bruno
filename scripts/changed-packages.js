#!/usr/bin/env node
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

/**
 * changed-packages.js
 *
 * Usage:
 *   node scripts/changed-packages.js <ref>
 *
 * Examples:
 *   node scripts/changed-packages.js main
 *   node scripts/changed-packages.js v1.2.3
 *
 * Description:
 *   Prints the top-level package directories under `packages/` that
 *   have changed since <ref>, reads their package names, and prints
 *   both the dependency tree (internal packages it depends on) and
 *   the dependent tree (internal packages that depend on it).
 *
 * Options:
 *   -h, --help    Show this help message
 */

const USAGE = [
  'Usage:',
  '  node scripts/changed-packages.js <ref>',
  '',
  'Examples:',
  '  node scripts/changed-packages.js main',
  '  node scripts/changed-packages.js v1.2.3',
  '',
  'Description:',
  '  Print package directories under packages/ that have changed since <ref>,',
  '  and show their internal dependency and dependent trees.',
  '',
  'Options:',
  '  -h, --help    Show this help message'
].join('\n');

const ref = process.argv.slice(2)[0];

if (!ref || ['-h', '--help'].includes(ref)) {
  console.log(USAGE);
  process.exit(0);
}

// Validate ref exists
try {
  const getRefs = execSync(`git show-ref`);
  const refs = getRefs.toString().split('\n').filter((d) => d.includes('refs/heads') || d.includes('refs/tags')).map((d) => {
    const [_, refPath] = d.split(/\s+/);
    return refPath.replace('refs/heads/', '').replace('refs/tags/', '');
  });

  if (!refs.includes(ref)) {
    console.error('The passed in Ref cannot be found');
    process.exit(1);
  }
} catch (err) {
  console.error('Error checking git refs:', err.message);
  process.exit(1);
}

// Get changed files since ref and map to top-level package directories
let changedFiles = [];
try {
  changedFiles = execSync(`git diff --name-only ${ref}`).toString().split('\n').filter(Boolean);
} catch (err) {
  console.error('Error running git diff:', err.message);
  process.exit(1);
}

const changedPackageDirs = Array.from(new Set(changedFiles.map((f) => {
  const parts = f.split('/');
  if (parts[0] === 'packages' && parts.length >= 2) {
    return `packages/${parts[1]}`;
  }
  return null;
}).filter(Boolean))).sort();

if (changedPackageDirs.length === 0) {
  console.log('No changed packages found since', ref);
  process.exit(0);
}

// Build map of all packages in packages/ -> name and their internal dependencies
const packagesRoot = path.join(process.cwd(), 'packages');
const allPackageDirs = fs.readdirSync(packagesRoot).filter((d) => {
  try {
    return fs.statSync(path.join(packagesRoot, d)).isDirectory();
  } catch (e) {
    return false;
  }
});

const packageNameByDir = {}; // 'packages/foo' -> '@scope/foo'
const packageDirByName = {}; // '@scope/foo' -> 'packages/foo'
const rawPackageJsonByName = {}; // name -> package.json contents

allPackageDirs.forEach((d) => {
  const pkgJsonPath = path.join(packagesRoot, d, 'package.json');
  try {
    const raw = JSON.parse(fs.readFileSync(pkgJsonPath, 'utf8'));
    if (raw && raw.name) {
      const dir = `packages/${d}`;
      packageNameByDir[dir] = raw.name;
      packageDirByName[raw.name] = dir;
      rawPackageJsonByName[raw.name] = raw;
    }
  } catch (e) {
    // ignore directories without valid package.json
  }
});

const packageNames = Object.keys(packageDirByName);

// Build dependency maps (only internal package deps)
const depsMap = {}; // pkgName -> [internal dep names]
const dependentsMap = {}; // pkgName -> Set(internal dependent names)

packageNames.forEach((name) => {
  const pkg = rawPackageJsonByName[name] || {};
  const allDeps = Object.assign({}, pkg.dependencies || {}, pkg.devDependencies || {}, pkg.peerDependencies || {});
  const internalDeps = Object.keys(allDeps).filter((depName) => packageNames.includes(depName));
  depsMap[name] = internalDeps;
  internalDeps.forEach((dep) => {
    dependentsMap[dep] = dependentsMap[dep] || new Set();
    dependentsMap[dep].add(name);
  });
});

function printTree(rootName, map, seen = new Set(), indent = '') {
  if (!map[rootName] || map[rootName].length === 0) return ''; // no children
  let out = '';
  const children = map[rootName];
  children.forEach((child) => {
    if (seen.has(child)) {
      out += `${indent}- ${child} (cycle)\n`;
      return;
    }
    out += `${indent}- ${child}\n`;
    seen.add(child);
    // For dependentsMap value is Set, convert to Array
    const nextChildren = Array.isArray(map[child]) ? map[child] : (map[child] ? Array.from(map[child]) : []);
    if (nextChildren.length > 0) {
      out += printTree(child, map, seen, indent + '  ');
    }
  });
  return out;
}

// For dependentsMap, convert sets to arrays for printing
const dependentsMapArr = {};
Object.keys(dependentsMap).forEach((k) => {
  dependentsMapArr[k] = Array.from(dependentsMap[k]);
});

// Build bottom-up tree for changed packages
const changedPackageNames = changedPackageDirs.map((d) => packageNameByDir[d]).filter(Boolean);

function getTransitiveDependents(pkgName, visited = new Set()) {
  if (visited.has(pkgName)) return [];
  visited.add(pkgName);

  const directDependents = Array.from(dependentsMap[pkgName] || []);
  let result = [];

  directDependents.forEach((dependent) => {
    if (changedPackageNames.includes(dependent)) {
      result.push(dependent);
    }
    result.push(...getTransitiveDependents(dependent, visited));
  });

  return result;
}

function buildUpdateOrder(changedPackages) {
  const levels = [];
  let remaining = new Set(changedPackages);

  while (remaining.size > 0) {
    const currentLevel = [];
    const nextLevel = [];

    remaining.forEach((pkg) => {
      const deps = depsMap[pkg] || [];
      const depsInRemaining = deps.filter((d) => remaining.has(d));

      if (depsInRemaining.length === 0) {
        currentLevel.push(pkg);
      } else {
        nextLevel.push(pkg);
      }
    });

    if (currentLevel.length === 0) {
      break;
    }

    currentLevel.forEach((pkg) => remaining.delete(pkg));
    levels.push(currentLevel.sort());
  }

  return levels;
}

console.log('='.repeat(80));
console.log('Changed packages since', ref);
console.log('='.repeat(80));
console.log();

const updateLevels = buildUpdateOrder(changedPackageNames);

if (updateLevels.length === 0) {
  console.log('No changed packages found.');
  process.exit(0);
}

updateLevels.forEach((level, idx) => {
  console.log(`Level ${idx + 1}:`);
  level.forEach((pkgName) => {
    const dir = packageDirByName[pkgName];
    console.log(`  ${dir || pkgName} -> ${pkgName}`);
    const transitiveDependents = getTransitiveDependents(pkgName);
    if (transitiveDependents.length > 0) {
      console.log(`    ├─ Dependent packages: ${transitiveDependents.join(', ')}`);
    }
  });
  console.log();
});

console.log('='.repeat(80));
