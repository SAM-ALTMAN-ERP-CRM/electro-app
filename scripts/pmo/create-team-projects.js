#!/usr/bin/env node
/**
 * scripts/pmo/create-team-projects.js
 *
 * Automatically creates individual GitHub Project Boards for each of the 11 teams
 * under the SAM-ALTMAN-ERP-CRM organization, links them to the electro-app repository,
 * sets visibility to public, and populates them with their respective team issues.
 */

const { execSync } = require('child_process');

const ORG = 'SAM-ALTMAN-ERP-CRM';
const REPO = 'electro-app';

const TEAMS = [
  { key: 'crm1', title: 'CRM-1: Sales Pipeline' },
  { key: 'crm2', title: 'CRM-2: Support & Warranty' },
  { key: 'crm3', title: 'CRM-3: Field Service' },
  { key: 'crm4', title: 'CRM-4: Customer Portal' },
  { key: 'crm5', title: 'CRM-5: Analytics & Timeline' },
  { key: 'erp1', title: 'ERP-1: Inventory & Warehouses' },
  { key: 'erp2', title: 'ERP-2: Procurement & POs' },
  { key: 'erp3', title: 'ERP-3: Manufacturing & Work Orders' },
  { key: 'erp4', title: 'ERP-4: Sales Orders & Dispatch' },
  { key: 'erp5', title: 'ERP-5: Invoicing & General Ledger' },
  { key: 'erp6', title: 'ERP-6: HR, Roles & Audit' },
];

function run(cmd, capture = true) {
  try {
    const out = execSync(cmd, { stdio: capture ? ['ignore', 'pipe', 'pipe'] : 'inherit', encoding: 'utf8' });
    return out ? out.trim() : '';
  } catch (err) {
    const stderr = err.stderr ? err.stderr.toString() : err.message;
    throw new Error(`Command failed: ${cmd}\n${stderr}`);
  }
}

async function main() {
  console.log(`\n======================================================`);
  console.log(`🚀 Creating 11 Team Projects in ${ORG}`);
  console.log(`======================================================\n`);

  // 1. Fetch existing projects in the organization
  console.log(`Checking existing projects in org ${ORG}...`);
  const existingRaw = run(`gh project list --owner ${ORG} --format json`);
  const existingProjects = JSON.parse(existingRaw).projects || [];

  const results = [];

  for (const team of TEAMS) {
    console.log(`\n------------------------------------------------------`);
    console.log(`📁 Processing ${team.title} (label: ${team.key})...`);

    // Check if project already exists
    let project = existingProjects.find(p => p.title.toLowerCase() === team.title.toLowerCase());

    if (!project) {
      console.log(`Creating project "${team.title}"...`);
      const createdRaw = run(`gh project create --owner ${ORG} --title "${team.title}" --format json`);
      project = JSON.parse(createdRaw);
      console.log(`Created project #${project.number} (${project.url})`);
    } else {
      console.log(`Found existing project #${project.number} (${project.url})`);
    }

    const projNum = project.number;

    // Link repo
    try {
      run(`gh project link ${projNum} --owner ${ORG} --repo ${REPO}`);
      console.log(`Linked to repo ${ORG}/${REPO}`);
    } catch (e) {
      // Ignore if already linked
    }

    // Set visibility to PUBLIC
    try {
      run(`gh project edit ${projNum} --owner ${ORG} --visibility PUBLIC`);
      console.log(`Set visibility to PUBLIC`);
    } catch (e) {
      // Ignore error if already public or permission nuance
    }

    // Fetch existing items in the project to avoid duplicates
    let existingItemUrls = new Set();
    try {
      const itemsRaw = run(`gh project item-list ${projNum} --owner ${ORG} --format json`);
      const parsedItems = JSON.parse(itemsRaw).items || [];
      for (const item of parsedItems) {
        if (item.content && item.content.url) {
          existingItemUrls.add(item.content.url);
        }
      }
    } catch (e) {
      // ignore
    }

    // Fetch open issues for this team
    const issuesRaw = run(`gh issue list --repo ${ORG}/${REPO} --label ${team.key} --state open --limit 50 --json number,title,url`);
    const issues = JSON.parse(issuesRaw);

    console.log(`Found ${issues.length} open issues for ${team.key}`);
    let addedCount = 0;

    for (const issue of issues) {
      if (existingItemUrls.has(issue.url)) {
        continue;
      }
      try {
        run(`gh project item-add ${projNum} --owner ${ORG} --url ${issue.url}`);
        addedCount++;
        process.stdout.write(`.`);
      } catch (e) {
        console.error(`\nFailed to add #${issue.number}: ${e.message}`);
      }
    }

    if (addedCount > 0) process.stdout.write('\n');
    console.log(`✅ Added ${addedCount} new issues to project #${projNum}`);

    results.push({
      team: team.title,
      projectNumber: projNum,
      url: project.url,
      issuesCount: issues.length
    });
  }

  console.log(`\n======================================================`);
  console.log(`🎉 ALL 11 TEAM PROJECTS SUCCESSFULLY CREATED & SYNCED`);
  console.log(`======================================================\n`);

  console.table(results);
}

main().catch(err => {
  console.error('\n❌ Fatal error:', err.message);
  process.exit(1);
});

