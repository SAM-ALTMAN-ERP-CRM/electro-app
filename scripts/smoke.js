#!/usr/bin/env node

/**
 * smoke.js
 * PMO smoke test:
 * 1. Runs `node --check` on every .js file under services/ (skipping node_modules).
 * 2. Verifies frontend/src/modules/<team>/index.jsx exists for all 11 teams.
 * Exits non-zero on any failure.
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const repoRoot = path.resolve(__dirname, '..');
const servicesDir = path.join(repoRoot, 'services');
const frontendModulesDir = path.join(repoRoot, 'frontend/src/modules');

const TEAMS = ['crm1', 'crm2', 'crm3', 'crm4', 'crm5', 'erp1', 'erp2', 'erp3', 'erp4', 'erp5', 'erp6'];

let hasErrors = false;

console.log('=== SMOKE TEST: SERVICES JAVASCRIPT SYNTAX ===');

function findJsFiles(dir) {
  let results = [];
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (file === 'node_modules' || file.startsWith('.')) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findJsFiles(fullPath));
    } else if (file.endsWith('.js')) {
      results.push(fullPath);
    }
  }
  return results;
}

const jsFiles = findJsFiles(servicesDir);
console.log(`Checking syntax of ${jsFiles.length} JavaScript files in services/...`);

for (const file of jsFiles) {
  const relPath = path.relative(repoRoot, file);
  try {
    execSync(`node --check "${file}"`, { stdio: 'pipe' });
    console.log(`  ✓ ${relPath}`);
  } catch (err) {
    console.error(`  ✗ SYNTAX ERROR in ${relPath}:`);
    console.error(err.stderr ? err.stderr.toString() : err.message);
    hasErrors = true;
  }
}

console.log('\n=== SMOKE TEST: FRONTEND MODULE SHELLS ===');
for (const team of TEAMS) {
  const modulePath = path.join(frontendModulesDir, team, 'index.jsx');
  const relPath = path.relative(repoRoot, modulePath);
  if (fs.existsSync(modulePath)) {
    console.log(`  ✓ ${relPath} exists`);
  } else {
    console.error(`  ✗ MISSING MODULE FILE: ${relPath} does not exist!`);
    hasErrors = true;
  }
}

if (hasErrors) {
  console.error('\nSMOKE TEST FAILED: One or more checks encountered errors.');
  process.exit(1);
} else {
  console.log('\nSMOKE TEST PASSED: All syntax checks and module files verified successfully.');
  process.exit(0);
}
