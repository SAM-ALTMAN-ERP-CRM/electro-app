#!/usr/bin/env node

/**
 * setup-github.js
 * Configures the GitHub repository, permissions, labels, milestones, rulesets, and repo settings.
 * Supports --dry-run (prints actions without mutating GitHub).
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// PARAMETERS
const ORG = 'SAM-ALTMAN-ERP-CRM';
const REPO = 'electro-app';
const FULL_REPO = `${ORG}/${REPO}`;
const DEFAULT_BRANCH = 'main';
const REPO_VISIBILITY = 'public'; // Public for GitHub Free organization plan

// TEAM SLUG MAPPINGS (Folder -> GitHub Team Slug)
// Folder names, branch prefixes, and labels stay crm1..erp6
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
  erp6: 'erp-6-hr-and-workforce',
  pmo: 'pmo'
};

const TEAMS = ['crm1', 'crm2', 'crm3', 'crm4', 'crm5', 'erp1', 'erp2', 'erp3', 'erp4', 'erp5', 'erp6'];

const isDryRun = process.argv.includes('--dry-run') || (!process.argv.includes('--apply') && !process.argv.includes('--real'));

function log(msg) {
  console.log(msg);
}

function runGh(cmd, silent = false) {
  try {
    return execSync(cmd, { encoding: 'utf-8', stdio: silent ? 'pipe' : 'pipe' }).trim();
  } catch (err) {
    if (silent) return null;
    throw err;
  }
}

// 1. LABELS CONFIGURATION (stay crm1..erp6)
const LABELS = [
  // Teams
  { name: 'crm1', color: '1f77b4', description: 'CRM-1: Sales pipeline' },
  { name: 'crm2', color: 'aec7e8', description: 'CRM-2: Support and warranty' },
  { name: 'crm3', color: 'ff7f0e', description: 'CRM-3: Customer 360' },
  { name: 'crm4', color: 'ffbb78', description: 'CRM-4: Marketing and engagement' },
  { name: 'crm5', color: '2ca02c', description: 'CRM-5: Portal and analytics' },
  { name: 'erp1', color: '98df8a', description: 'ERP-1: Inventory and warehouse' },
  { name: 'erp2', color: 'd62728', description: 'ERP-2: Procurement and suppliers' },
  { name: 'erp3', color: 'ff9896', description: 'ERP-3: Production and quality' },
  { name: 'erp4', color: '9467bd', description: 'ERP-4: Orders and dispatch' },
  { name: 'erp5', color: 'c5b0d5', description: 'ERP-5: Finance, access and app shell' },
  { name: 'erp6', color: '8c564b', description: 'ERP-6: HR and workforce' },
  // Members
  { name: 'member-a', color: '2b9348', description: 'Assigned to Member A' },
  { name: 'member-b', color: '55a630', description: 'Assigned to Member B' },
  { name: 'member-c', color: '80b918', description: 'Assigned to Member C' },
  { name: 'member-d', color: 'aacc00', description: 'Assigned to Member D' },
  // Roles
  { name: 'role-lead', color: 'e76f51', description: 'Role: Team Lead (R1)' },
  { name: 'role-data', color: 'f4a261', description: 'Role: Data owner (R2)' },
  { name: 'role-ui', color: 'e9c46a', description: 'Role: UI owner (R3)' },
  { name: 'role-qa', color: '2a9d8f', description: 'Role: QA and docs owner (R4)' },
  // Kinds
  { name: 'build', color: '1d76db', description: 'Feature build issue' },
  { name: 'role', color: '0e8a16', description: 'Team responsibility role issue' },
  { name: 'bug', color: 'd93f0b', description: 'Bug report or regression' },
  { name: 'blocker', color: 'b60205', description: 'Urgent blocking dependency' },
  { name: 'change-request', color: '5319e7', description: 'Scope or contract change request' },
  // Statuses
  { name: 'blocked', color: 'd93f0b', description: 'Work stalled waiting on dependency' },
  { name: 'needs-pmo-review', color: 'fbca04', description: 'Pending PMO review or escalation' },
  // Tiers (14-Day Roadmap)
  { name: 'tier-1', color: 'b60205', description: 'Tier 1: Core golden-path demo (must have)' },
  { name: 'tier-2', color: '1d76db', description: 'Tier 2: Standard module scope (should have)' },
  { name: 'tier-3', color: '6c757d', description: 'Tier 3: Stretch scope (cuttable)' }
];

// 2. MILESTONES CONFIGURATION
const MILESTONES = [
  { title: 'Wave 0 Foundation', due_on: '2026-11-05T23:59:59Z', description: 'Foundation skeleton, shared helpers, 11 backend health checks and frontend shell' },
  { title: 'G1 Design freeze', due_on: '2026-11-06T23:59:59Z', description: 'Gate 1: Master data frozen, 3NF ER diagrams, wireframes, and all inter-service contracts signed off' },
  { title: 'G2 Core flow', due_on: '2026-11-09T23:59:59Z', description: 'Gate 2: Each team demos core flow on isolated database; mock APIs verified' },
  { title: 'G3 Integration', due_on: '2026-11-12T23:59:59Z', description: 'Gate 3: All contracts live with real calls; order runs from quote to invoice' },
  { title: 'G4 Release candidate', due_on: '2026-11-13T23:59:59Z', description: 'Gate 4: Feature freeze, release candidate tagged, USE_MOCKS=false, 0 critical bugs' },
  { title: 'Final demo', due_on: '2026-11-16T23:59:59Z', description: 'Final project presentation and 9-step cross-team live walkthrough' }
];

// 3. RULESET CONFIGURATION (strict status checks: false)
const RULESET_PAYLOAD = {
  name: 'main-protection',
  target: 'branch',
  enforcement: 'active',
  conditions: {
    ref_name: {
      include: [`refs/heads/${DEFAULT_BRANCH}`],
      exclude: []
    }
  },
  rules: [
    {
      type: 'pull_request',
      parameters: {
        required_approving_review_count: 1,
        dismiss_stale_reviews_on_push: false,
        require_code_owner_review: true,
        require_last_push_approval: false,
        required_review_thread_resolution: true
      }
    },
    {
      type: 'required_status_checks',
      parameters: {
        strict_required_status_checks_policy: false, // Strict status checks OFF
        required_status_checks: [
          { context: 'branch-name' },
          { context: 'folder-check' },
          { context: 'build' },
          { context: 'no-secrets' },
          { context: 'pr-format' }
        ]
      }
    },
    {
      type: 'non_fast_forward'
    },
    {
      type: 'deletion'
    },
    {
      type: 'required_linear_history'
    }
  ],
  bypass_actors: []
};

async function preflightChecks() {
  log('--- Step 0: Preflight Checks ---');

  // Check 1: gh CLI authentication & scopes
  log('Checking gh CLI authentication and scopes...');
  const authStatus = runGh('gh auth status 2>&1', true);
  if (!authStatus || authStatus.includes('You are not logged into any GitHub hosts')) {
    if (isDryRun) {
      log('[PREFLIGHT] [DRY-RUN NOTICE] gh CLI is currently unauthenticated. Authentication with scopes [repo, admin:org] is required for live execution.');
    } else {
      throw new Error("gh CLI is not authenticated! Run 'gh auth login' with scopes 'repo', 'admin:org' before executing.");
    }
  } else {
    log('gh CLI authentication verified.');
    // Check required scopes
    if (!authStatus.includes('repo')) {
      log('[PREFLIGHT WARNING] Token may be missing the full "repo" scope.');
    }
    if (!authStatus.includes('admin:org') && !authStatus.includes('write:org')) {
      log('[PREFLIGHT WARNING] Token may be missing "admin:org" or "write:org" scope to manage teams.');
    }
  }

  // Check 2: Org plan & repo visibility (Free org ruleset limitation)
  log(`Verifying organization plan and ruleset compatibility...`);
  if (isDryRun) {
    log(`[PREFLIGHT] [DRY-RUN] Checking org '${ORG}' plan.`);
    log(`[PREFLIGHT] Repository visibility is configured as '${REPO_VISIBILITY}'.`);
    if (REPO_VISIBILITY !== 'public') {
      log(`[PREFLIGHT WARNING] If organization is on GitHub Free plan, rulesets require a PUBLIC repository!`);
    } else {
      log(`[PREFLIGHT] Rulesets are fully supported for public repositories on GitHub Free organization plans.`);
    }
  } else {
    try {
      const orgInfoRaw = runGh(`gh api orgs/${ORG} --jq '{plan: .plan.name}'`, true);
      const orgInfo = orgInfoRaw ? JSON.parse(orgInfoRaw) : null;
      if (orgInfo && orgInfo.plan === 'free' && REPO_VISIBILITY !== 'public') {
        throw new Error(`CRITICAL: Organization '${ORG}' is on GitHub Free plan, but repository visibility is set to '${REPO_VISIBILITY}'. GitHub Free organizations only support branch rulesets on PUBLIC repositories! Change REPO_VISIBILITY to 'public'.`);
      }
      log(`Organization plan verified: ${orgInfo ? orgInfo.plan : 'unknown'}. Visibility '${REPO_VISIBILITY}' is compatible.`);
    } catch (err) {
      if (err.message.includes('CRITICAL')) throw err;
      log(`Could not query org plan (check org read permissions). Proceeding with visibility '${REPO_VISIBILITY}'.`);
    }
  }

  // Check 3: Verify all 12 mapped team slugs exist in the GitHub organization
  log('Verifying mapped GitHub team slugs existence...');
  for (const [folder, slug] of Object.entries(TEAM_SLUGS)) {
    if (isDryRun) {
      log(`  [PREFLIGHT] [DRY-RUN] Would verify team slug '${ORG}/${slug}' for folder '${folder}'.`);
    } else {
      const teamCheck = runGh(`gh api orgs/${ORG}/teams/${slug} --jq .name`, true);
      if (!teamCheck) {
        throw new Error(`CRITICAL: GitHub team slug '${slug}' (mapped to folder '${folder}') does not exist in organization '${ORG}'! Please create the team in GitHub first.`);
      }
      log(`  Verified team '${slug}' (${teamCheck})`);
    }
  }

  log('Preflight checks passed.\n');
}

async function main() {
  log('======================================================================');
  log(` GITHUB SETUP SCRIPT: ${FULL_REPO} (${isDryRun ? 'DRY-RUN MODE' : 'LIVE EXECUTION'})`);
  log('======================================================================\n');

  // Preflight checks
  await preflightChecks();

  // Step 1: Repo creation check & initial commit
  log('--- Step 1: Repository Existence & Initial Push ---');
  if (isDryRun) {
    log(`[DRY-RUN] Would check if repo '${FULL_REPO}' exists via 'gh repo view ${FULL_REPO}'.`);
    log(`[DRY-RUN] If missing, would create PUBLIC repository '${FULL_REPO}' (visibility: ${REPO_VISIBILITY}).`);
    log(`[DRY-RUN] Would commit all files from phases 1 and 2 to branch '${DEFAULT_BRANCH}' and push to origin before ruleset enforcement.`);
  } else {
    const repoCheck = runGh(`gh repo view ${FULL_REPO} --json id,visibility`, true);
    if (!repoCheck) {
      log(`Creating ${REPO_VISIBILITY} repository: ${FULL_REPO}...`);
      runGh(`gh repo create ${FULL_REPO} --${REPO_VISIBILITY} --description "Electro App CRM + ERP monorepo"`);
      log(`Repository ${FULL_REPO} created.`);
    } else {
      log(`Repository ${FULL_REPO} already exists.`);
    }

    log(`Ensuring local git repo is committed to '${DEFAULT_BRANCH}'...`);
    try {
      execSync('git rev-parse --is-inside-work-tree', { stdio: 'pipe' });
    } catch {
      execSync('git init -b main');
    }
    runGh(`git remote remove origin 2>/dev/null || true`);
    runGh(`git remote add origin https://github.com/${FULL_REPO}.git`);
    log(`Pushing main branch to origin...`);
    runGh(`git push -u origin main`);
  }
  log('Step 1 complete.\n');

  // Step 2: Grant repo permissions using mapped team slugs
  log('--- Step 2: Configure Team Permissions (Using Mapped Slugs) ---');
  if (isDryRun) {
    log(`[DRY-RUN] Would grant 'admin' permission to PMO team slug: ${ORG}/${TEAM_SLUGS.pmo}`);
    for (const team of TEAMS) {
      const slug = TEAM_SLUGS[team];
      log(`[DRY-RUN] Would grant 'push' (write) permission to team slug: ${ORG}/${slug} (folder: ${team})`);
    }
  } else {
    log(`Granting 'admin' permission to PMO team '${TEAM_SLUGS.pmo}'...`);
    runGh(`gh api -X PUT orgs/${ORG}/teams/${TEAM_SLUGS.pmo}/repos/${FULL_REPO} -f permission=admin`);
    for (const team of TEAMS) {
      const slug = TEAM_SLUGS[team];
      log(`Granting 'push' permission to team '${slug}' (${team})...`);
      runGh(`gh api -X PUT orgs/${ORG}/teams/${slug}/repos/${FULL_REPO} -f permission=push`);
    }
  }
  log('Step 2 complete.\n');

  // Step 3: Labels
  log('--- Step 3: Create / Verify Labels (Idempotent - Slugs stay crm1..erp6) ---');
  if (isDryRun) {
    log(`[DRY-RUN] Would verify and create ${LABELS.length} labels:`);
    for (const lbl of LABELS) {
      log(`  - [${lbl.name}] (Color: #${lbl.color}) -> "${lbl.description}"`);
    }
  } else {
    const existingLabelsRaw = runGh(`gh api repos/${FULL_REPO}/labels --paginate --jq .[].name`, true) || '';
    const existingLabels = new Set(existingLabelsRaw.split('\n').filter(Boolean));

    for (const lbl of LABELS) {
      if (existingLabels.has(lbl.name)) {
        log(`Updating existing label '${lbl.name}'...`);
        runGh(`gh api -X PATCH repos/${FULL_REPO}/labels/${encodeURIComponent(lbl.name)} -f color="${lbl.color}" -f description="${lbl.description}"`);
      } else {
        log(`Creating label '${lbl.name}'...`);
        runGh(`gh api -X POST repos/${FULL_REPO}/labels -f name="${lbl.name}" -f color="${lbl.color}" -f description="${lbl.description}"`);
      }
    }
  }
  log('Step 3 complete.\n');

  // Step 4: Milestones
  log('--- Step 4: Create / Verify Milestones (Idempotent) ---');
  if (isDryRun) {
    log(`[DRY-RUN] Would verify and create ${MILESTONES.length} milestones:`);
    for (const ms of MILESTONES) {
      log(`  - "${ms.title}" (Due: ${ms.due_on.slice(0, 10)}) -> "${ms.description}"`);
    }
  } else {
    const existingMsRaw = runGh(`gh api repos/${FULL_REPO}/milestones --paginate --jq .[].title`, true) || '';
    const existingMs = new Set(existingMsRaw.split('\n').filter(Boolean));

    for (const ms of MILESTONES) {
      if (existingMs.has(ms.title)) {
        log(`Milestone '${ms.title}' already exists.`);
      } else {
        log(`Creating milestone '${ms.title}' (Due: ${ms.due_on})...`);
        runGh(`gh api -X POST repos/${FULL_REPO}/milestones -f title="${ms.title}" -f due_on="${ms.due_on}" -f description="${ms.description}"`);
      }
    }
  }
  log('Step 4 complete.\n');

  // Step 5: Branch ruleset for main (Strict status checks OFF)
  log('--- Step 5: Branch Ruleset for main (Strict Status Checks OFF) ---');
  log('Ruleset JSON Payload:');
  log(JSON.stringify(RULESET_PAYLOAD, null, 2));

  if (isDryRun) {
    log(`\n[DRY-RUN] Would apply above ruleset to repos/${FULL_REPO}/rulesets`);
  } else {
    const existingRulesetsRaw = runGh(`gh api repos/${FULL_REPO}/rulesets --jq .[].name`, true) || '';
    const existingRulesets = new Set(existingRulesetsRaw.split('\n').filter(Boolean));

    const tmpPayloadPath = path.join('/tmp', `ruleset-${Date.now()}.json`);
    fs.writeFileSync(tmpPayloadPath, JSON.stringify(RULESET_PAYLOAD));

    if (existingRulesets.has(RULESET_PAYLOAD.name)) {
      log(`Ruleset '${RULESET_PAYLOAD.name}' already exists. Updating...`);
      const rulesetId = runGh(`gh api repos/${FULL_REPO}/rulesets --jq '.[] | select(.name=="${RULESET_PAYLOAD.name}") | .id'`);
      runGh(`gh api -X PUT repos/${FULL_REPO}/rulesets/${rulesetId} --input ${tmpPayloadPath}`);
    } else {
      log(`Creating ruleset '${RULESET_PAYLOAD.name}'...`);
      runGh(`gh api -X POST repos/${FULL_REPO}/rulesets --input ${tmpPayloadPath}`);
    }
    fs.unlinkSync(tmpPayloadPath);
  }
  log('Step 5 complete.\n');

  // Step 6: Repo Settings
  log('--- Step 6: Repository Settings ---');
  if (isDryRun) {
    log(`[DRY-RUN] Would configure repo settings on '${FULL_REPO}':`);
    log(`  - visibility: public`);
    log(`  - allow_squash_merge: true`);
    log(`  - allow_merge_commit: false`);
    log(`  - allow_rebase_merge: false`);
    log(`  - delete_branch_on_merge: true`);
    log(`  - has_wiki: false`);
    log(`  - squash_merge_commit_title: "PR_TITLE"`);
    log(`  - squash_merge_commit_message: "PR_BODY"`);
    log(`  - GitHub Actions: enabled`);
  } else {
    log(`Applying repository settings...`);
    runGh(`gh api -X PATCH repos/${FULL_REPO} \
      -F allow_squash_merge=true \
      -F allow_merge_commit=false \
      -F allow_rebase_merge=false \
      -F delete_branch_on_merge=true \
      -F has_wiki=false \
      -f squash_merge_commit_title="PR_TITLE" \
      -f squash_merge_commit_message="PR_BODY"`);
    log(`Enabling GitHub Actions...`);
    runGh(`gh api -X PUT repos/${FULL_REPO}/actions/permissions -F enabled=true`);
  }
  log('Step 6 complete.\n');

  // Step 7: GitHub Project (v2) Board Setup
  log('--- Step 7: GitHub Project (v2) Board Setup ---');
  const projectCmdAvailable = runGh(`gh project --help 2>&1`, true);
  if (projectCmdAvailable && !projectCmdAvailable.includes('unknown command')) {
    log(`'gh project' extension is available.`);
    if (isDryRun) {
      log(`[DRY-RUN] Would create Project (v2) 'Electro App' in organization '${ORG}' with columns:`);
      log(`  Backlog, In progress, In review, PMO review, Done.`);
    }
  } else {
    log(`Note: 'gh project' CLI extension is not installed or lacks scope.`);
    log(`Manual fallback steps for GitHub Project (v2):`);
    log(`  1. Navigate to: https://github.com/orgs/${ORG}/projects`);
    log(`  2. Click 'New Project' -> 'Board' template.`);
    log(`  3. Name project: 'Electro App'.`);
    log(`  4. Configure columns: [Backlog, In progress, In review, PMO review, Done].`);
    log(`  5. Link repository: '${FULL_REPO}'.`);
  }
  log('Step 7 complete.\n');

  log('======================================================================');
  log(` Setup completed successfully (${isDryRun ? 'DRY-RUN ONLY - NO CHANGES APPLIED' : 'APPLIED TO GITHUB'}).`);
  log('======================================================================');
}

main().catch(err => {
  console.error('\nFATAL ERROR during GitHub setup:', err.message);
  process.exit(1);
});
