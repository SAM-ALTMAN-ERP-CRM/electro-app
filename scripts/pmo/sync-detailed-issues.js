#!/usr/bin/env node
/**
 * scripts/pmo/sync-detailed-issues.js
 *
 * Automatically enriches all 180 GitHub issues across all 11 teams with:
 * - Domain & Service Context (Port, DB, Modules, Allowed Roles)
 * - Exact File Paths to touch
 * - Full Specification (Tables, Columns, Endpoints, JSON payloads, UI elements)
 * - Cross-Team Dependencies & Mocks
 * - Step-by-step Acceptance Criteria ("Done When" checklist)
 * - Git branch creation commands & PR conventions
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ORG = 'SAM-ALTMAN-ERP-CRM';
const REPO = 'electro-app';
const FULL_REPO = `${ORG}/${REPO}`;

const TEAMS_META = {
  crm1: {
    slug: 'crm1',
    name: 'CRM-1 Sales Pipeline',
    serviceDir: 'services/crm1',
    port: 5101,
    db: 'crm1_db',
    moduleDir: 'frontend/src/modules/crm1',
    roles: ['admin', 'sales'],
    step: 'Steps 1 & 2 of 9 (Customer Inquiries, Quotations & Order Handoff)'
  },
  crm2: {
    slug: 'crm2',
    name: 'CRM-2 Support & Warranty',
    serviceDir: 'services/crm2',
    port: 5102,
    db: 'crm2_db',
    moduleDir: 'frontend/src/modules/crm2',
    roles: ['admin', 'support'],
    step: 'Step 9 of 9 (Customer Support, Warranty Checks & RMA Product Returns)'
  },
  crm3: {
    slug: 'crm3',
    name: 'CRM-3 Customer 360',
    serviceDir: 'services/crm3',
    port: 5103,
    db: 'crm3_db',
    moduleDir: 'frontend/src/modules/crm3',
    roles: ['admin', 'sales', 'support'],
    step: 'Step 3 of 9 (Customer Master Directory, Contacts & Unified Event Timeline)'
  },
  crm4: {
    slug: 'crm4',
    name: 'CRM-4 Marketing & Engagement',
    serviceDir: 'services/crm4',
    port: 5104,
    db: 'crm4_db',
    moduleDir: 'frontend/src/modules/crm4',
    roles: ['admin', 'sales'],
    step: 'Step 1 of 9 (Marketing Campaigns, Web Inquiry Forms & Feedback Surveys)'
  },
  crm5: {
    slug: 'crm5',
    name: 'CRM-5 Portal & Analytics',
    serviceDir: 'services/crm5',
    port: 5105,
    db: 'crm5_db',
    moduleDir: 'frontend/src/modules/crm5',
    roles: ['admin', 'sales', 'support', 'warehouse', 'finance', 'hr'],
    step: 'Executive Analytics Dashboards & Customer Self-Service Portal'
  },
  erp1: {
    slug: 'erp1',
    name: 'ERP-1 Inventory & Warehouses',
    serviceDir: 'services/erp1',
    port: 5201,
    db: 'erp1_db',
    moduleDir: 'frontend/src/modules/erp1',
    roles: ['admin', 'warehouse', 'sales'],
    step: 'Steps 4 & 5 of 9 (Product Catalog, Multi-Warehouse Stock & Serial Allocation)'
  },
  erp2: {
    slug: 'erp2',
    name: 'ERP-2 Procurement & Suppliers',
    serviceDir: 'services/erp2',
    port: 5202,
    db: 'erp2_db',
    moduleDir: 'frontend/src/modules/erp2',
    roles: ['admin', 'warehouse', 'finance'],
    step: 'Step 4 of 9 (Supplier Management, Purchase Requests & Goods Receipts)'
  },
  erp3: {
    slug: 'erp3',
    name: 'ERP-3 Production & Quality',
    serviceDir: 'services/erp3',
    port: 5203,
    db: 'erp3_db',
    moduleDir: 'frontend/src/modules/erp3',
    roles: ['admin', 'warehouse'],
    step: 'Step 4 of 9 (Bill of Materials, Manufacturing Work Orders & QC Inspection)'
  },
  erp4: {
    slug: 'erp4',
    name: 'ERP-4 Orders & Dispatch',
    serviceDir: 'services/erp4',
    port: 5204,
    db: 'erp4_db',
    moduleDir: 'frontend/src/modules/erp4',
    roles: ['admin', 'sales', 'warehouse'],
    step: 'Steps 3, 5 & 6 of 9 (Sales Orders, Courier Dispatch & Return Receipts)'
  },
  erp5: {
    slug: 'erp5',
    name: 'ERP-5 Finance & General Ledger',
    serviceDir: 'services/erp5',
    port: 5205,
    db: 'erp5_db',
    moduleDir: 'frontend/src/modules/erp5',
    roles: ['admin', 'finance'],
    step: 'Steps 6 & 7 of 9 (GST Tax Invoices, General Ledger, Payments & Credit Notes)'
  },
  erp6: {
    slug: 'erp6',
    name: 'ERP-6 HR & Workforce',
    serviceDir: 'services/erp6',
    port: 5206,
    db: 'erp6_db',
    moduleDir: 'frontend/src/modules/erp6',
    roles: ['admin', 'hr'],
    step: 'Step 8 of 9 (Employee Directory, Attendance, Payroll & Sales Commissions)'
  }
};

function runGh(cmd) {
  return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
}

function parseTeamDoc(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const sections = content.split(/\n(?=###\s+\[)/);
  const issues = {};

  for (const sec of sections) {
    const match = sec.match(/^###\s+\[([A-Z0-9]+-[A-Z0-9]+)\]\s+([^\n]+)/);
    if (!match) continue;
    const key = match[1];
    const title = match[2].trim();
    const body = sec.replace(/^###\s+\[[A-Z0-9]+-[A-Z0-9]+\][^\n]+\n+/, '').trim();
    issues[key] = { key, title, body };
  }

  return issues;
}

function formatIssueBody(issueKey, issueData, meta) {
  const branchName = `${meta.slug}/${issueKey.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`;

  // If already rich formatted (like CRM1)
  if (issueData.body.includes('### 📋 Detailed Specification') || issueData.body.includes('**Files to Create/Edit**:')) {
    return `> **Team**: ${meta.name} | **Service**: \`${meta.serviceDir}\` (Port ${meta.port}) | **Database**: \`${meta.db}\`  
> **Frontend Module**: \`${meta.moduleDir}\` (\`roles: ${JSON.stringify(meta.roles)}\`)  
> **Order-to-Cash Workflow**: ${meta.step}

---

### 📋 Detailed Specification

${issueData.body}

---

### 🌿 Git & PR Workflow
\`\`\`bash
git checkout main
git pull origin main
git checkout -b ${branchName}
\`\`\`

**PR Requirements**:
1. Commit message: \`feat(${meta.slug}): [${issueKey}] ${issueData.title}\`
2. Open Pull Request to \`main\` with title: \`[${issueKey}] ${issueData.title}\`
3. Include \`Closes #<issue_number>\` in the PR body.
4. Verify all acceptance criteria above before requesting PMO review.
`;
  }

  // Parse sections from raw text
  const buildMatch = issueData.body.match(/- \*\*Build\*\*:\s*([\s\S]*?)(?=\n- \*\*Depends on\*\*|$)/);
  const dependsMatch = issueData.body.match(/- \*\*Depends on\*\*:\s*([\s\S]*?)(?=\n- \*\*Needed by\*\*|\n- \*\*Done when\*\*|$)/);
  const neededMatch = issueData.body.match(/- \*\*Needed by\*\*:\s*([\s\S]*?)(?=\n- \*\*Done when\*\*|$)/);
  const doneMatch = issueData.body.match(/- \*\*Done when\*\*:\s*([\s\S]*?)$/);

  const buildText = buildMatch ? buildMatch[1].trim() : issueData.body;
  const dependsText = dependsMatch ? dependsMatch[1].trim() : 'None';
  const neededText = neededMatch ? neededMatch[1].trim() : 'None';
  const doneText = doneMatch ? doneMatch[1].trim() : 'Feature works and passes verification.';

  const isRole = issueKey.includes('-R');
  const isFrontend = /Page|screen|UI|screen consistency|wireframe/i.test(issueData.title) || /Page \//.test(buildText);
  const isBackend = /table|API|endpoint|CRUD|POST|GET/i.test(issueData.title) || /Table |GET |POST /.test(buildText);

  let filesText = '';
  if (isRole) {
    filesText = `• \`docs/${meta.slug}/\` (documentation, demo script, ER diagrams, test cases)`;
  } else {
    const backendFiles = isBackend ? `• \`${meta.serviceDir}/db/schema.sql\`\n• \`${meta.serviceDir}/db/seed.sql\`\n• \`${meta.serviceDir}/routes/<resource>.js\`` : '';
    const frontendFiles = isFrontend ? `• \`${meta.moduleDir}/pages/<Page>.jsx\`\n• \`${meta.moduleDir}/index.jsx\`` : '';
    filesText = [backendFiles, frontendFiles].filter(Boolean).join('\n');
  }

  return `> **Team**: ${meta.name} | **Service**: \`${meta.serviceDir}\` (Port ${meta.port}) | **Database**: \`${meta.db}\`  
> **Frontend Module**: \`${meta.moduleDir}\` (\`roles: ${JSON.stringify(meta.roles)}\`)  
> **Order-to-Cash Workflow**: ${meta.step}

---

### 📋 Task Overview
${buildText}

---

### 📁 Target Files
${filesText || `• \`${meta.serviceDir}/\` or \`${meta.moduleDir}/\``}

---

### 🔗 Cross-Team Contracts & Dependencies
• **Depends on**: ${dependsText}  
• **Needed by**: ${neededText}  

> [!NOTE]  
> If an external endpoint is not yet merged, use \`callService('${meta.slug}', path, { mock: '<name>' })\` with 3 realistic seed rows adhering to Section 5 shared IDs.

---

### ✅ Acceptance Criteria ("Done When")
${doneText.split(';').map(item => `- [ ] ${item.trim()}`).join('\n')}

---

### 🌿 Git & PR Workflow
\`\`\`bash
git checkout main
git pull origin main
git checkout -b ${branchName}
\`\`\`

**PR Guidelines**:
1. Branch Name: \`${branchName}\`
2. Commit Message: \`feat(${meta.slug}): [${issueKey}] ${issueData.title}\`
3. PR Title: \`[${issueKey}] ${issueData.title}\`
4. PR Description must include: \`Closes #<issue_number>\`
5. Only touch files within \`${meta.serviceDir}/\` or \`${meta.moduleDir}/\`.
`;
}

async function main() {
  const targetTeam = process.argv[2]; // e.g. 'crm2' or omit for all

  console.log(`\n======================================================`);
  console.log(`🚀 Syncing Highly Detailed Issues to GitHub`);
  console.log(`======================================================\n`);

  console.log('Fetching existing issues from GitHub...');
  const rawList = runGh(`gh issue list --repo ${FULL_REPO} --limit 500 --json number,title`);
  const parsedList = JSON.parse(rawList);

  const keyToNumber = new Map();
  for (const item of parsedList) {
    const m = item.title.match(/^\[([A-Z0-9]+-[A-Z0-9]+)\]/);
    if (m) {
      keyToNumber.set(m[1], item.number);
    }
  }
  console.log(`Found ${keyToNumber.size} existing tracked issues on GitHub.`);

  const teamsToSync = targetTeam ? [targetTeam] : Object.keys(TEAMS_META);
  let totalUpdated = 0;

  for (const t of teamsToSync) {
    const meta = TEAMS_META[t];
    if (!meta) {
      console.warn(`Unknown team: ${t}`);
      continue;
    }

    const docPath = path.join(__dirname, `../../docs/${t}/issues.md`);
    const issues = parseTeamDoc(docPath);
    console.log(`\n------------------------------------------------------`);
    console.log(`📁 Processing ${meta.name} (${Object.keys(issues).length} issues)...`);

    for (const [key, issue] of Object.entries(issues)) {
      const issueNum = keyToNumber.get(key);
      if (!issueNum) {
        console.warn(`[WARN] Issue ${key} not found on GitHub.`);
        continue;
      }

      const body = formatIssueBody(key, issue, meta);
      const tmpFile = path.join('/tmp', `issue-${key}.md`);
      fs.writeFileSync(tmpFile, body, 'utf8');

      try {
        runGh(`gh issue edit ${issueNum} --repo ${FULL_REPO} --body-file "${tmpFile}"`);
        process.stdout.write(`.`);
        totalUpdated++;
      } catch (err) {
        console.error(`\n❌ Failed to update Issue #${issueNum} [${key}]: ${err.message}`);
      }
    }
    console.log(`\n✅ Synced ${meta.name}`);
  }

  console.log(`\n======================================================`);
  console.log(`🎉 Successfully synced ${totalUpdated} detailed issues to GitHub!`);
  console.log(`======================================================\n`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
