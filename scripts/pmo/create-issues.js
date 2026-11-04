#!/usr/bin/env node

/**
 * create-issues.js
 * Creates or updates the 180 GitHub issues idempotently with assigned labels, milestones, and assignees.
 * Requires scripts/pmo/members.json for live execution.
 * Supports --dry-run and --update-existing.
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// PARAMETERS
const ORG = 'SAM-ALTMAN-ERP-CRM';
const REPO = 'electro-app';
const FULL_REPO = `${ORG}/${REPO}`;

const TEAM_SLUGS = {
  crm1: 'crm-1-sales-pipeline',
  crm2: 'crm-2-support-and-warranty',
  crm3: 'crm-3-customer-360',
  crm4: 'crm-4-marketing-and-engagement',
  crm5: 'crm-5-portal-and-analytics',
  erp1: 'erp-1-inventory-and-warehouse',
  erp2: 'erp-2-procurement-and-suppliers',
  erp3: 'erp-3-production-and-quality',
  erp4: 'erp-4-orders-and-dispatch',
  erp5: 'erp-5-finance-access-and-reporting',
  erp6: 'erp-6-hr-and-workforce'
};

const isDryRun = process.argv.includes('--dry-run') || (!process.argv.includes('--apply') && !process.argv.includes('--real'));
const updateExisting = process.argv.includes('--update-existing');

// MILESTONE MAPPING RULES (FIRST MATCH WINS)
const WAVE_1_KEYS = ['ERP5-C2', 'ERP5-C3', 'CRM3-A1', 'ERP6-A1', 'ERP1-A1', 'ERP1-A3', 'ERP1-B1', 'CRM1-A1', 'ERP2-B1', 'ERP4-A1', 'ERP5-D1'];
const WAVE_3_KEYS = ['CRM1-C3', 'CRM2-C3', 'ERP4-C3', 'ERP4-D3', 'ERP3-A3', 'ERP2-D1', 'ERP6-C3', 'ERP6-D1', 'CRM4-B4'];

// TIER DEFINITIONS (136 BUILD ISSUES: 60 TIER 1, 42 TIER 2, 34 TIER 3)
const TIER_1_KEYS = new Set([
  // Original 47
  'CRM1-A1', 'CRM1-B1', 'CRM1-C1', 'CRM1-C3',
  'CRM2-A1', 'CRM2-B1', 'CRM2-B3', 'CRM2-C1', 'CRM2-C3',
  'CRM3-A1', 'CRM3-B1', 'CRM3-B3', 'CRM3-C1',
  'CRM4-A1', 'CRM4-A3', 'CRM4-B4', 'CRM4-C1',
  'CRM5-A1', 'CRM5-B1',
  'ERP1-A1', 'ERP1-A3', 'ERP1-B1', 'ERP1-B3', 'ERP1-C1', 'ERP1-C3',
  'ERP2-B1',
  'ERP3-A1', 'ERP3-A3', 'ERP3-B1', 'ERP3-B3',
  'ERP4-A1', 'ERP4-B1', 'ERP4-B3', 'ERP4-C1', 'ERP4-C3', 'ERP4-D1', 'ERP4-D3',
  'ERP5-A1', 'ERP5-A4', 'ERP5-B1', 'ERP5-B3', 'ERP5-D1', 'ERP5-C1', 'ERP5-C4', 'ERP5-C5',
  'ERP6-A1', 'ERP6-D1',
  // Promoted 13 demo screens
  'CRM1-A2', 'CRM1-C2', 'CRM3-B2', 'CRM2-A2', 'CRM2-B2', 'CRM2-C2',
  'CRM5-A2', 'ERP4-A2', 'ERP4-B2', 'ERP4-C2', 'ERP4-D2', 'ERP5-A2', 'ERP5-B2'
]);

const TIER_3_KEYS = new Set([
  'CRM1-A3', 'CRM1-B3', 'CRM1-D2',
  'CRM2-A3', 'CRM2-D1', 'CRM2-D2', 'CRM2-D3',
  'CRM3-A3', 'CRM3-C3', 'CRM3-D1', 'CRM3-D2', 'CRM3-D3',
  'CRM4-B1', 'CRM4-B2', 'CRM4-B3', 'CRM4-C3', 'CRM4-D3',
  'CRM5-A3', 'CRM5-B3', 'CRM5-C3', 'CRM5-D3',
  'ERP1-D2', 'ERP1-D3',
  'ERP2-A3', 'ERP2-C3', 'ERP2-D3',
  'ERP3-C3', 'ERP3-D3',
  'ERP5-A3', 'ERP5-D3',
  'ERP6-A3', 'ERP6-B3', 'ERP6-C3', 'ERP6-D3'
]);

const MILESTONE_RULES = [
  // Specific milestone alignments for dependent screens
  { match: (k, iss) => ['ERP2-D2', 'ERP6-D2'].includes(k), milestone: 'G3 Integration' },

  // 1. ERP5-C1 -> Wave 0 Foundation
  { match: (k, iss) => k === 'ERP5-C1', milestone: 'Wave 0 Foundation' },
  // 2. ERP5-C4 -> G2 Core flow ; ERP5-C5 -> G3 Integration
  { match: (k, iss) => k === 'ERP5-C4', milestone: 'G2 Core flow' },
  { match: (k, iss) => k === 'ERP5-C5', milestone: 'G3 Integration' },
  // 3. issues listed as Wave 1 in pack Section 10 -> G1 Design freeze
  { match: (k, iss) => iss.wave === 1 || WAVE_1_KEYS.includes(k), milestone: 'G1 Design freeze' },
  // 4. role R2 and R3 -> G1 Design freeze ; role R1 and R4 -> G4 Release candidate
  { match: (k, iss) => iss.kind === 'role' && (k.endsWith('-R2') || k.endsWith('-R3')), milestone: 'G1 Design freeze' },
  { match: (k, iss) => iss.kind === 'role' && (k.endsWith('-R1') || k.endsWith('-R4')), milestone: 'G4 Release candidate' },
  // 5. every caller issue listed in Wave 3 of Section 10 -> G3 Integration
  { match: (k, iss) => iss.wave === 3 || WAVE_3_KEYS.includes(k), milestone: 'G3 Integration' },
  // 6. other build issues numbered 1 or 2 -> G2 Core flow
  { match: (k, iss) => iss.kind === 'build' && ['1', '2'].includes(k.slice(-1)), milestone: 'G2 Core flow' },
  // 7. other build issues numbered 3, 4 or 5 -> G3 Integration
  { match: (k, iss) => iss.kind === 'build' && ['3', '4', '5'].includes(k.slice(-1)), milestone: 'G3 Integration' }
];

function getMilestone(issue) {
  for (const rule of MILESTONE_RULES) {
    if (rule.match(issue.key, issue)) {
      return rule.milestone;
    }
  }
  return 'Unassigned';
}

function getTier(issue) {
  if (issue.kind !== 'build') return null;
  if (TIER_1_KEYS.has(issue.key)) return 'tier-1';
  if (TIER_3_KEYS.has(issue.key)) return 'tier-3';
  return 'tier-2';
}

function getLabels(issue) {
  const labels = [issue.team, `member-${issue.member}`, issue.kind];
  if (issue.kind === 'role') {
    if (issue.key.endsWith('-R1')) labels.push('role-lead');
    else if (issue.key.endsWith('-R2')) labels.push('role-data');
    else if (issue.key.endsWith('-R3')) labels.push('role-ui');
    else if (issue.key.endsWith('-R4')) labels.push('role-qa');
  } else if (issue.kind === 'build') {
    const tier = getTier(issue);
    if (tier) labels.push(tier);
  }
  return labels;
}

function generateSlug(title) {
  return title
    .toLowerCase()
    .replace(/\(.*?\)/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 30)
    .replace(/-+$/, '');
}

function getBranchFooter(issue) {
  const shortTitle = generateSlug(issue.title);
  const keyLower = issue.key.split('-')[1].toLowerCase();

  // PMO Foundation and Scripts (ERP5-C1, C4, C5)
  if (['ERP5-C1', 'ERP5-C4', 'ERP5-C5'].includes(issue.key)) {
    return `Branch: pmo/${keyLower}-${shortTitle}`;
  }
  // Integrator Shell and Auth (ERP5-C2, C3)
  if (['ERP5-C2', 'ERP5-C3'].includes(issue.key)) {
    return `Branch: integrator/${keyLower}-${shortTitle}`;
  }
  // Standard team issues
  const part = issue.key.split('-')[1].toLowerCase();
  return `Branch: ${issue.team}/${part}-${shortTitle}`;
}

function getAssignee(iss, members) {
  if (['ERP5-C1', 'ERP5-C4', 'ERP5-C5'].includes(iss.key)) {
    return members.pmo1 || 'unassigned';
  }
  const memberKey = `member-${iss.member}`;
  return (members[iss.team] && members[iss.team][memberKey]) || 'unassigned';
}

function buildBody(issue) {
  let body = `> ${issue.context_line}\n\n`;
  body += `## Build\n${issue.build}\n\n`;
  body += `## Depends on\n${issue.depends_on}\n\n`;
  if (issue.needed_by && issue.needed_by.trim()) {
    body += `## Needed by\n${issue.needed_by}\n\n`;
  }
  body += `## Done when\n${issue.done_when}\n\n`;
  body += `---\n${getBranchFooter(issue)}\n`;
  return body;
}

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function runGh(cmd, silent = false) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'pipe' }).trim();
  } catch (err) {
    if (silent) return null;
    throw err;
  }
}

async function main() {
  const repoRoot = path.resolve(__dirname, '../..');
  const issuesFile = path.join(repoRoot, 'scripts/pmo/issues.json');
  const membersFile = path.join(repoRoot, 'scripts/pmo/members.json');
  const membersExampleFile = path.join(repoRoot, 'scripts/pmo/members.example.json');

  if (!fs.existsSync(issuesFile)) {
    console.error(`FATAL: ${issuesFile} does not exist! Run scripts/pmo/parse_issues.py first.`);
    process.exit(1);
  }

  // Preflight check: gh authentication
  console.log('--- Step 0: Preflight Checks ---');
  const authStatus = runGh('gh auth status 2>&1', true);
  if (!authStatus || authStatus.includes('You are not logged into any GitHub hosts')) {
    if (isDryRun) {
      console.log('[PREFLIGHT] [DRY-RUN NOTICE] gh CLI is not logged in. For live execution, run "gh auth login".');
    } else {
      console.error("FATAL: gh CLI is not authenticated! Run 'gh auth login' with 'repo' scope first.");
      process.exit(1);
    }
  } else {
    console.log('gh CLI authentication verified.');
  }

  // Check members.json requirement
  let members = {};
  if (fs.existsSync(membersFile)) {
    try {
      members = JSON.parse(fs.readFileSync(membersFile, 'utf-8'));
      console.log(`[PREFLIGHT] Loaded student assignees from ${membersFile}`);
    } catch (e) {
      console.error(`FATAL: Failed to parse ${membersFile}:`, e.message);
      process.exit(1);
    }
  } else {
    if (!isDryRun) {
      console.error(`FATAL: ${membersFile} is REQUIRED for live issue creation!`);
      console.error(`Please copy ${membersExampleFile} to ${membersFile} and fill in student GitHub handles.`);
      process.exit(1);
    } else {
      console.log(`[PREFLIGHT] [DRY-RUN NOTICE] ${membersFile} not found. Using placeholders from ${membersExampleFile} for dry-run preview.`);
      if (fs.existsSync(membersExampleFile)) {
        members = JSON.parse(fs.readFileSync(membersExampleFile, 'utf-8'));
      }
    }
  }

  // Check for placeholders in members.json
  const placeholdersFound = [];
  for (const [teamOrKey, val] of Object.entries(members)) {
    if (typeof val === 'string') {
      if (val.startsWith('username-') || val.includes('placeholder')) {
        placeholdersFound.push(`${teamOrKey}: ${val}`);
      }
    } else if (typeof val === 'object' && val !== null) {
      for (const [mKey, mVal] of Object.entries(val)) {
        if (typeof mVal === 'string' && (mVal.startsWith('username-') || mVal.includes('placeholder'))) {
          placeholdersFound.push(`${teamOrKey}.${mKey}: ${mVal}`);
        }
      }
    }
  }

  if (placeholdersFound.length > 0) {
    console.error('FATAL: Found placeholder usernames in members.json:');
    placeholdersFound.forEach(p => console.error(`  - ${p}`));
    console.error('Please update members.json with real GitHub usernames before proceeding.');
    if (!isDryRun) process.exit(1);
  } else {
    console.log('No placeholder usernames found in members.json.');
  }

  // Verify team memberships on GitHub (read-only GET)
  console.log('Verifying team memberships in GitHub org...');
  const membershipMismatches = [];
  for (const [team, slug] of Object.entries(TEAM_SLUGS)) {
    const teamMembers = members[team];
    if (!teamMembers) continue;

    const rawLogins = runGh(`gh api orgs/${ORG}/teams/${slug}/members --jq '.[].login' 2>/dev/null`, true);
    if (!rawLogins) {
      console.warn(`[PREFLIGHT WARNING] Could not verify members for team slug '${slug}' (check scopes/network).`);
      continue;
    }
    const orgTeamSet = new Set(rawLogins.split('\n').map(s => s.trim().toLowerCase()).filter(Boolean));

    for (const [mKey, handle] of Object.entries(teamMembers)) {
      if (!handle || handle.startsWith('username-')) continue;
      if (!orgTeamSet.has(handle.toLowerCase())) {
        membershipMismatches.push(`${handle} (mapped as ${team}.${mKey}) is NOT in GitHub team '${slug}'`);
      }
    }
  }

  if (membershipMismatches.length > 0) {
    console.error('FATAL: Found team membership mismatches on GitHub:');
    membershipMismatches.forEach(m => console.error(`  - ${m}`));
    console.error('Please add the students to their respective GitHub teams before creating issues.');
    if (!isDryRun) process.exit(1);
  } else {
    console.log('All student usernames verified in their respective GitHub teams.');
  }

  console.log(`[PREFLIGHT] Mode: ${isDryRun ? 'DRY-RUN' : 'LIVE'} | Update Existing: ${updateExisting ? 'ENABLED' : 'DISABLED'}`);
  console.log('Preflight checks passed.\n');

  const issues = JSON.parse(fs.readFileSync(issuesFile, 'utf-8'));

  console.log('======================================================================');
  console.log(` GITHUB ISSUE CREATION: ${FULL_REPO} (${isDryRun ? 'DRY-RUN MODE' : 'LIVE EXECUTION'})`);
  console.log('======================================================================\n');

  // Compute aggregate statistics
  const stats = {
    tiers: { 'tier-1': 0, 'tier-2': 0, 'tier-3': 0, 'role': 0 },
    milestones: {},
    assignees: {}
  };

  for (const iss of issues) {
    const ms = getMilestone(iss);
    const tier = getTier(iss);
    const assignee = getAssignee(iss, members);

    stats.milestones[ms] = (stats.milestones[ms] || 0) + 1;
    if (tier) stats.tiers[tier] = (stats.tiers[tier] || 0) + 1;
    else stats.tiers['role'] = (stats.tiers['role'] || 0) + 1;
    stats.assignees[assignee] = (stats.assignees[assignee] || 0) + 1;
  }

  if (isDryRun) {
    console.log(`Summary of ${issues.length} issues to be processed:\n`);
    console.log(
      `${'Key'.padEnd(10)} | ${'Milestone'.padEnd(20)} | ${'Assignee'.padEnd(18)} | ${'Labels'}`
    );
    console.log('-'.repeat(88));

    for (const iss of issues) {
      const ms = getMilestone(iss);
      const labels = getLabels(iss);
      const assignee = getAssignee(iss, members);
      console.log(
        `${iss.key.padEnd(10)} | ${ms.padEnd(20)} | ${assignee.padEnd(18)} | ${labels.join(', ')}`
      );
    }

    console.log('\n======================================================================');
    console.log(` DRY-RUN COMPLETED: ${issues.length} issues formatted and verified.`);
    console.log('======================================================================');
    console.log('\n--- AGGREGATE BREAKDOWN ---');
    console.log('Tiers (136 build issues + 44 role issues):');
    console.log(`  Tier 1: ${stats.tiers['tier-1']} (expected: 60)`);
    console.log(`  Tier 2: ${stats.tiers['tier-2']} (expected: 42)`);
    console.log(`  Tier 3: ${stats.tiers['tier-3']} (expected: 34)`);
    console.log(`  Role (no tier): ${stats.tiers['role']} (expected: 44)`);
    console.log('\nMilestones:');
    for (const [ms, count] of Object.entries(stats.milestones)) {
      console.log(`  ${ms.padEnd(22)}: ${count}`);
    }
    console.log('\nAssignees:');
    for (const [assignee, count] of Object.entries(stats.assignees)) {
      console.log(`  ${assignee.padEnd(22)}: ${count}`);
    }
    console.log('\nFlags supported on live run:');
    console.log('  --apply             Execute live issue creation against GitHub');
    console.log('  --update-existing   Update issue title, body, milestone, labels, and assignees if [KEY] already exists');
    console.log('======================================================================\n');
    return;
  }

  // LIVE EXECUTION
  console.log('Fetching existing issues from GitHub...');
  let existingIssuesMap = new Map(); // key -> issue number
  try {
    const rawExisting = runGh(`gh issue list --repo ${FULL_REPO} --limit 500 --json number,title --jq '.[] | "\\(.number)|\t\\(.title)"'`, true) || '';
    rawExisting.split('\n').filter(Boolean).forEach(line => {
      const parts = line.split('|\t');
      const num = parts[0];
      const title = parts[1] || '';
      const m = title.match(/^\[([A-Z0-9]+-[A-Z0-9]+)\]/);
      if (m) {
        existingIssuesMap.set(m[1], num);
      }
    });
    console.log(`Found ${existingIssuesMap.size} existing tracked issues in ${FULL_REPO}.`);
  } catch (err) {
    console.warn('Could not query existing issues (repo may be empty or access restricted).');
  }

  let createdCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;

  for (let i = 0; i < issues.length; i++) {
    const iss = issues[i];
    const existingNum = existingIssuesMap.get(iss.key);

    if (existingNum && !updateExisting) {
      console.log(`[SKIP ${i+1}/${issues.length}] [${iss.key}] already exists as #${existingNum} (use --update-existing to update).`);
      skippedCount++;
      continue;
    }

    const title = `[${iss.key}] ${iss.title}`;
    const body = buildBody(iss);
    const ms = getMilestone(iss);
    const labels = getLabels(iss);
    const assignee = getAssignee(iss, members);

    const tmpBodyPath = path.join('/tmp', `issue-${iss.key}-${Date.now()}.md`);
    fs.writeFileSync(tmpBodyPath, body, 'utf-8');

    let cmd = '';
    if (existingNum && updateExisting) {
      // UPDATE EXISTING ISSUE
      cmd = `gh issue edit "${existingNum}" --repo "${FULL_REPO}" --title "${title.replace(/"/g, '\\"')}" --body-file "${tmpBodyPath}" --milestone "${ms}"`;
      for (const lbl of labels) {
        cmd += ` --add-label "${lbl}"`;
      }
      if (assignee && assignee !== 'unassigned') {
        cmd += ` --add-assignee "${assignee}"`;
      }
    } else {
      // CREATE NEW ISSUE
      cmd = `gh issue create --repo "${FULL_REPO}" --title "${title.replace(/"/g, '\\"')}" --body-file "${tmpBodyPath}" --milestone "${ms}"`;
      for (const lbl of labels) {
        cmd += ` --label "${lbl}"`;
      }
      if (assignee && assignee !== 'unassigned') {
        cmd += ` --assignee "${assignee}"`;
      }
    }

    let success = false;
    let attempts = 0;
    while (!success && attempts < 3) {
      attempts++;
      try {
        const resultUrl = runGh(cmd);
        if (existingNum && updateExisting) {
          console.log(`[UPDATED ${i+1}/${issues.length}] ${iss.key} (#${existingNum}) -> ${resultUrl}`);
          updatedCount++;
        } else {
          console.log(`[CREATED ${i+1}/${issues.length}] ${iss.key} -> ${resultUrl}`);
          createdCount++;
        }
        success = true;
      } catch (err) {
        const errMsg = err.message || '';
        if (errMsg.includes('secondary rate limit') || errMsg.includes('rate limit')) {
          console.warn(`[RATE LIMIT] Encountered rate limit on ${iss.key}. Sleeping 60s before retry...`);
          await sleep(60000);
        } else {
          console.error(`Error processing issue ${iss.key} (attempt ${attempts}):`, errMsg);
          if (attempts >= 3) throw err;
          await sleep(3000);
        }
      }
    }

    if (fs.existsSync(tmpBodyPath)) fs.unlinkSync(tmpBodyPath);

    // Rate limit safety pause: 1.5s
    await sleep(1500);
  }

  console.log('\n======================================================================');
  console.log(` EXECUTION SUMMARY: Created: ${createdCount}, Updated: ${updatedCount}, Skipped: ${skippedCount}, Total: ${issues.length}`);
  console.log('--- AGGREGATE BREAKDOWN ---');
  console.log('Tiers (136 build issues + 44 role issues):');
  console.log(`  Tier 1: ${stats.tiers['tier-1']}`);
  console.log(`  Tier 2: ${stats.tiers['tier-2']}`);
  console.log(`  Tier 3: ${stats.tiers['tier-3']}`);
  console.log(`  Role (no tier): ${stats.tiers['role']}`);
  console.log('\nMilestones:');
  for (const [ms, count] of Object.entries(stats.milestones)) {
    console.log(`  ${ms.padEnd(22)}: ${count}`);
  }
  console.log('\nAssignees:');
  for (const [assignee, count] of Object.entries(stats.assignees)) {
    console.log(`  ${assignee.padEnd(22)}: ${count}`);
  }
  console.log('======================================================================\n');
}

main().catch(err => {
  console.error('\nFATAL ERROR during issue processing:', err);
  process.exit(1);
});
