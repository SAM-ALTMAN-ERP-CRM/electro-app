// scripts/pmo/assign-to-leads.js
// Assigns all team issues on GitHub to their respective Team Lead (Member A),
// allowing the Team Lead to review and allot/reassign each issue to their team members.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const REPO = 'SAM-ALTMAN-ERP-CRM/electro-app';

function main() {
  console.log('=== PMO: REASSIGN ALL TEAM ISSUES TO TEAM LEADS ===\n');

  const membersPath = path.join(__dirname, 'members.json');
  if (!fs.existsSync(membersPath)) {
    console.error('members.json not found at:', membersPath);
    process.exit(1);
  }

  const members = JSON.parse(fs.readFileSync(membersPath, 'utf-8'));
  const teamLeads = {
    crm1: members.crm1['member-a'],
    crm2: members.crm2['member-a'],
    crm3: members.crm3['member-a'],
    crm4: members.crm4['member-a'],
    crm5: members.crm5['member-a'],
    erp1: members.erp1['member-a'],
    erp2: members.erp2['member-a'],
    erp3: members.erp3['member-a'],
    erp4: members.erp4['member-a'],
    erp5: members.erp5['member-a'],
    erp6: members.erp6['member-a']
  };

  console.log('Target Team Leads:');
  for (const [team, lead] of Object.entries(teamLeads)) {
    console.log(`  ${team.toUpperCase().padEnd(6)}: @${lead}`);
  }

  console.log('\nFetching current live issues from GitHub...');
  const raw = execSync(`gh issue list --repo ${REPO} --limit 500 --json number,title,assignees`, { encoding: 'utf-8' });
  const issues = JSON.parse(raw);
  console.log(`Fetched ${issues.length} total issues from repository.`);

  let reassignments = [];
  for (const iss of issues) {
    const m = iss.title.match(/^\[([A-Z0-9]+)-([A-Z0-9]+)\]/);
    if (!m) continue;
    const teamPrefix = m[1].toLowerCase(); // e.g. crm1, erp5, pmo
    const issueCode = m[2]; // e.g. A1, C1, R1

    // Keep PMO foundational issues assigned to PMO Lead
    if (teamPrefix === 'pmo' || (teamPrefix === 'erp5' && ['C1', 'C4', 'C5'].includes(issueCode))) {
      continue;
    }

    const lead = teamLeads[teamPrefix];
    if (!lead) continue;

    const currentAssignees = (iss.assignees || []).map(a => a.login);
    if (currentAssignees.length === 1 && currentAssignees[0] === lead) {
      // Already assigned solely to the lead
      continue;
    }

    reassignments.push({
      number: iss.number,
      title: iss.title,
      team: teamPrefix.toUpperCase(),
      current: currentAssignees.join(', ') || '(none)',
      target: lead
    });
  }

  console.log(`\nFound ${reassignments.length} issues to reassign to Team Leads.`);
  if (reassignments.length === 0) {
    console.log('All issues are already assigned to their respective Team Leads!');
    return;
  }

  const apply = process.argv.includes('--apply');
  if (!apply) {
    console.log('\n[DRY-RUN] Run with --apply to execute reassignments on GitHub.');
    console.log('Sample of issues to reassign:');
    for (const r of reassignments.slice(0, 10)) {
      console.log(`  #${r.number.toString().padEnd(4)} [${r.team}] ${r.title.slice(0, 50).padEnd(52)} | ${r.current} -> @${r.target}`);
    }
    return;
  }

  console.log('\nApplying reassignments live on GitHub...');
  let successCount = 0;
  for (let i = 0; i < reassignments.length; i++) {
    const r = reassignments[i];
    try {
      execSync(`gh api repos/${REPO}/issues/${r.number} -X PATCH -f "assignees[]=${r.target}"`, { stdio: 'ignore' });
      successCount++;
      process.stdout.write(`[${i + 1}/${reassignments.length}] Reassigned #${r.number} (${r.team}) -> @${r.target}\n`);
    } catch (err) {
      console.error(`Failed to reassign #${r.number}:`, err.message);
    }
  }

  console.log(`\n=== COMPLETED: Successfully reassigned ${successCount}/${reassignments.length} issues to Team Leads! ===`);
}

main();

