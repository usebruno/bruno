#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const PACKAGES_DIR = path.join(__dirname, '..', 'packages');
const EXCLUDE_DIRS = ['node_modules', 'dist', 'build', '.next', 'coverage', '.git'];
const EXCLUDE_PACKAGES = ['bruno-toml', 'bruno-tests', 'bruno-docs'];
const CODE_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.css', '.scss', '.json', '.md'];

function countLinesInFile(filePath) {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    return content.split('\n').length;
  } catch (error) {
    return 0;
  }
}

function shouldExcludeDir(dirName) {
  return EXCLUDE_DIRS.includes(dirName) || dirName.startsWith('.');
}

function isCodeFile(fileName) {
  return CODE_EXTENSIONS.some(ext => fileName.endsWith(ext));
}

function countLinesInDirectory(dirPath) {
  let totalLines = 0;
  let fileCount = 0;
  
  function walkDir(currentPath) {
    const items = fs.readdirSync(currentPath);
    
    for (const item of items) {
      const itemPath = path.join(currentPath, item);
      const stat = fs.statSync(itemPath);
      
      if (stat.isDirectory()) {
        if (!shouldExcludeDir(item)) {
          walkDir(itemPath);
        }
      } else if (stat.isFile() && isCodeFile(item)) {
        const lines = countLinesInFile(itemPath);
        totalLines += lines;
        fileCount++;
      }
    }
  }
  
  walkDir(dirPath);
  return { totalLines, fileCount };
}

function getPackages() {
  const packages = [];
  const items = fs.readdirSync(PACKAGES_DIR);
  
  for (const item of items) {
    const itemPath = path.join(PACKAGES_DIR, item);
    const stat = fs.statSync(itemPath);
    
    if (stat.isDirectory() && !shouldExcludeDir(item) && !EXCLUDE_PACKAGES.includes(item)) {
      packages.push({
        name: item,
        path: itemPath
      });
    }
  }
  
  return packages;
}

function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function printTable(data) {
  // Calculate column widths
  const nameWidth = Math.max(20, ...data.map(d => d.name.length));
  const locWidth = 12;
  const filesWidth = 12;
  
  // Header
  console.log('\n┌' + '─'.repeat(nameWidth + 2) + '┬' + '─'.repeat(locWidth + 2) + '┬' + '─'.repeat(filesWidth + 2) + '┐');
  console.log(`│ ${'Package'.padEnd(nameWidth)} │ ${'LOC'.padStart(locWidth)} │ ${'Files'.padStart(filesWidth)} │`);
  console.log('├' + '─'.repeat(nameWidth + 2) + '┼' + '─'.repeat(locWidth + 2) + '┼' + '─'.repeat(filesWidth + 2) + '┤');
  
  // Data rows
  let totalLOC = 0;
  let totalFiles = 0;
  
  for (const row of data) {
    console.log(`│ ${row.name.padEnd(nameWidth)} │ ${formatNumber(row.loc).padStart(locWidth)} │ ${formatNumber(row.files).padStart(filesWidth)} │`);
    totalLOC += row.loc;
    totalFiles += row.files;
  }
  
  // Footer
  console.log('├' + '─'.repeat(nameWidth + 2) + '┼' + '─'.repeat(locWidth + 2) + '┼' + '─'.repeat(filesWidth + 2) + '┤');
  console.log(`│ ${'TOTAL'.padEnd(nameWidth)} │ ${formatNumber(totalLOC).padStart(locWidth)} │ ${formatNumber(totalFiles).padStart(filesWidth)} │`);
  console.log('└' + '─'.repeat(nameWidth + 2) + '┴' + '─'.repeat(locWidth + 2) + '┴' + '─'.repeat(filesWidth + 2) + '┘\n');
}

function main() {
  console.log('Counting lines of code in Bruno packages...\n');
  
  const packages = getPackages();
  const results = [];
  
  for (const pkg of packages) {
    process.stdout.write(`Analyzing ${pkg.name}...`);
    const { totalLines, fileCount } = countLinesInDirectory(pkg.path);
    results.push({
      name: pkg.name,
      loc: totalLines,
      files: fileCount
    });
    process.stdout.write(' Done\n');
  }
  
  // Sort by LOC descending
  results.sort((a, b) => b.loc - a.loc);
  
  printTable(results);
}

main();