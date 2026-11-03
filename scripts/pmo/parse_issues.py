#!/usr/bin/env python3
import re
import json
import os
import sys

def main():
    repo_root = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
    pack_path = os.path.join(repo_root, 'docs/issues-pack.md')
    issues_out_path = os.path.join(repo_root, 'scripts/pmo/issues.json')
    members_out_path = os.path.join(repo_root, 'scripts/pmo/members.example.json')

    if not os.path.exists(pack_path):
        print(f"ERROR: {pack_path} does not exist!", file=sys.stderr)
        sys.exit(1)

    with open(pack_path, 'r', encoding='utf-8') as f:
        text = f.read()

    # Normalize hyphens across linebreaks (e.g. ERP1-\nA3 -> ERP1-A3)
    text = re.sub(r'([A-Z0-9]+)-\s*\n\s*([A-Z0-9]+)', r'\1-\2', text)

    # 1. Parse Context Lines
    context_lines = {}
    ctx_matches = re.findall(
        r'Context line to paste at the top of every ([^:]+):\s*(.*?)(?=\n\s*(?:Member A|ERP-5 Member C|$))',
        text,
        re.DOTALL
    )
    for team_header, content in ctx_matches:
        team_slug = team_header.strip().split()[0].lower().replace('-', '')
        context_lines[team_slug] = ' '.join(content.split())

    expected_teams = ['crm1', 'crm2', 'crm3', 'crm4', 'crm5', 'erp1', 'erp2', 'erp3', 'erp4', 'erp5', 'erp6']
    for t in expected_teams:
        if t not in context_lines:
            print(f"ERROR: Missing context line for team {t}!", file=sys.stderr)
            sys.exit(1)

    # 2. Parse Waves from Section 10
    wave_lists = {
        0: ['ERP5-C1'],
        1: ['ERP5-C2', 'ERP5-C3', 'CRM3-A1', 'ERP6-A1', 'ERP1-A1', 'ERP1-A3', 'ERP1-B1', 'CRM1-A1', 'ERP2-B1', 'ERP4-A1', 'ERP5-D1'],
        2: ['ERP1-B3', 'ERP1-C1', 'ERP1-C3', 'CRM3-B3', 'CRM3-C1', 'CRM1-B1', 'CRM1-C1', 'ERP3-A1', 'ERP3-B3', 'ERP4-B1', 'ERP4-C1', 'ERP5-A1', 'ERP5-A4', 'ERP5-B1', 'ERP5-B3'],
        3: ['CRM1-C3', 'CRM2-C3', 'ERP4-C3', 'ERP4-D3', 'ERP3-A3', 'ERP2-D1', 'ERP6-C3', 'ERP6-D1', 'CRM4-B4']
    }
    wave_lookup = {}
    for w, keys in wave_lists.items():
        for k in keys:
            wave_lookup[k] = w

    # Cross-team rows from Section 8b for R4
    cross_team_rows_map = {
        'crm1': '1, 2, 3, 4, 9, 11',
        'crm2': '4, 5, 6, 7, 10, 12',
        'crm3': '4, 8, 10, 12, 19',
        'crm4': '2, 4, 8, 9',
        'crm5': '10, 11, 12',
        'erp1': '2, 13, 14, 16, 18, 20, 22, 23, 25',
        'erp2': '13, 14, 15, 17',
        'erp3': '16, 17, 18, 21',
        'erp4': '3, 4, 6, 7, 10, 19 to 26',
        'erp5': '10, 15, 19, 24, 26, 27, 28, 29',
        'erp6': '1, 5, 27, 28'
    }

    # 3. Parse Build Issues (Section 8a)
    sec8a_start = text.find('8a. Issues by team')
    sec8a_end = text.find('8b. Role issues')
    if sec8a_start == -1 or sec8a_end == -1:
        print("ERROR: Could not locate Section 8a/8b in docs/issues-pack.md!", file=sys.stderr)
        sys.exit(1)

    sec8a = text[sec8a_start:sec8a_end]
    headers = list(re.finditer(r'^\s*\[([A-Z0-9]+-[A-Z0-9]+)\]', sec8a, re.MULTILINE))

    build_issues = []
    team_build_counts = {t: 0 for t in expected_teams}

    for i in range(len(headers)):
        start_pos = headers[i].start()
        end_pos = headers[i+1].start() if i+1 < len(headers) else len(sec8a)
        chunk = sec8a[start_pos:end_pos]
        key = headers[i].group(1)

        parts = key.split('-')
        team = parts[0].lower()
        member = parts[1][0].lower()

        context_line = context_lines.get(team, '')

        title_m = re.search(r'^\s*\[[A-Z0-9]+-[A-Z0-9]+\]\s*(.*?)(?=\n\s*Build(?:\s*\([^)]*\))?:)', chunk, re.DOTALL)
        title = ' '.join(title_m.group(1).split()) if title_m else ''

        build_m = re.search(r'Build(?:\s*\([^)]*\))?:\s*(.*?)(?=\n\s*(?:Depends on|Needed by|Done when):)', chunk, re.DOTALL)
        dep_m = re.search(r'Depends on:\s*(.*?)(?=\n\s*(?:Needed by|Done when):)', chunk, re.DOTALL)
        need_m = re.search(r'Needed by:\s*(.*?)(?=\n\s*(?:Done when):)', chunk, re.DOTALL)
        done_m = re.search(r'Done when:\s*(.*?)(?=\n\s*(?:Member [A-D]|Role issues|CRM-[0-9]|ERP-[0-9]|\Z))', chunk, re.DOTALL)

        extra_build = ''
        eb_m = re.search(r'Build\s*(\([^)]*\)):', chunk)
        if eb_m:
            extra_build = eb_m.group(1) + ' '

        build_text = (extra_build + (' '.join(build_m.group(1).split()) if build_m else '')).strip()
        dep_text = (' '.join(dep_m.group(1).split()) if dep_m else '').strip()
        need_text = (' '.join(need_m.group(1).split()) if need_m else '').strip()
        done_text = (' '.join(done_m.group(1).split()) if done_m else '').strip()

        wave_val = wave_lookup.get(key, None)

        issue_obj = {
            'key': key,
            'team': team,
            'member': member,
            'title': title,
            'context_line': context_line,
            'build': build_text,
            'depends_on': dep_text,
            'needed_by': need_text,
            'done_when': done_text,
            'kind': 'build',
            'wave': wave_val
        }
        build_issues.append(issue_obj)
        team_build_counts[team] += 1

    # 4. Generate Role Issues (Section 8b)
    role_issues = []
    for team in expected_teams:
        prefix = team.upper()
        t_count = team_build_counts[team]
        ctx = context_lines[team]

        # R1: Team Lead (Member a)
        r1 = {
            'key': f"{prefix}-R1",
            'team': team,
            'member': 'a',
            'title': "Team Lead: README and demo script",
            'context_line': ctx,
            'build': f"Keep docs/{team}/README.md (what the module does, how to run it, endpoint list, which other teams you call and who calls you). Write docs/{team}/demo.md: a 5-step demo script of your module, with the exact customer, SKU and rep IDs from Section 5. Run a 10-minute check every Friday: every merged PR of the team follows the folder rules, index.jsx lists every page, nothing outside your own folders was changed. Chase teams you are waiting for using the Depends on lines.",
            'depends_on': f"Start now. Final demo script waits for all {t_count} build issues of your team (WAIT).",
            'needed_by': "",
            'done_when': "README and demo script in main; demo script can be followed by someone outside the team.",
            'kind': "role",
            'wave': None
        }

        # R2: Data owner (Member b)
        r2 = {
            'key': f"{prefix}-R2",
            'team': team,
            'member': 'b',
            'title': "Data owner: ER diagram, data dictionary and seed verification",
            'context_line': ctx,
            'build': f"Draw the ER diagram of your tables in 3NF (docs/{team}/er-diagram.md as a Mermaid diagram or an image) and write a short data dictionary (table, column, type, meaning). Review every schema.sql change in the team. Check that your seed.sql follows the shared seed contract (Section 5): same customer, SKU, employee, dealer and serial IDs, and that npm run reset loads it with no error.",
            'depends_on': "Tables arrive with the team's A1, B1, C1, D1 issues (WAIT for the final diagram; draw the first version from the issue text on day 1).",
            'needed_by': "",
            'done_when': "ER diagram and data dictionary match the final schema; seed matches the contract; reset runs clean.",
            'kind': "role",
            'wave': None
        }

        # R3: UI owner (Member c)
        r3 = {
            'key': f"{prefix}-R3",
            'team': team,
            'member': 'c',
            'title': "UI owner: Wireframes and screen consistency",
            'context_line': ctx,
            'build': f"Draw simple wireframes (paper photo, Figma or draw.io) for every page of your module, one image per page in docs/{team}/wireframes/, before the page issues start. Agree the look with the other UI owners (same badge colours, same table style, same form layout). Check that every page is registered in frontend/src/modules/{team}/index.jsx with the right path prefix and roles, that nothing creates its own router or navbar, and that print styles hide the sidebar.",
            'depends_on': "None to start. Needed by the team's frontend issues (A2, B2, C2, D2 and similar): wireframes should be ready within the first 3 days of the sprint.",
            'needed_by': "",
            'done_when': f"Wireframes for all pages exist; every page opens from the sidebar at /{team}/... and looks consistent.",
            'kind': "role",
            'wave': None
        }

        # R4: QA and docs owner (Member d)
        rows_str = cross_team_rows_map.get(team, '')
        r4 = {
            'key': f"{prefix}-R4",
            'team': team,
            'member': 'd',
            'title': "QA and docs owner: Test cases, API spec and cross-team verification",
            'context_line': ctx,
            'build': f"Write test cases (a table: id, issue key, steps, expected result, actual, pass/fail), at least 3 per build issue, in docs/{team}/tests.md. Write the API spec docs/{team}/api.md (every endpoint: method, path, request body, response, error codes) and a Postman collection. Run your team's rows of the cross-team table (Section 7) with USE_MOCKS=false and file a bug issue for any failure. Which cross-team rows (Section 7) this team must verify: {rows_str}.",
            'depends_on': "Test cases wait for each build issue to be merged (WAIT per issue). ERP5-C5 (end-to-end test) is the final check.",
            'needed_by': "",
            'done_when': "Test cases all run with results; API spec matches the code; bug issues are filed and closed.",
            'kind': "role",
            'wave': None
        }

        role_issues.extend([r1, r2, r3, r4])

    all_issues = build_issues + role_issues

    # 5. Validation
    print("==================================================")
    print("               VALIDATION REPORT                  ")
    print("==================================================")
    build_count = len(build_issues)
    role_count = len(role_issues)
    total_count = len(all_issues)
    print(f"Build issues: {build_count} (expected 136)")
    print(f"Role issues:  {role_count} (expected 44)")
    print(f"Total issues: {total_count} (expected 180)")
    print("--------------------------------------------------")
    print(f"{'Team':<8} | {'Build':<6} | {'Role':<6} | {'Total':<6}")
    print("---------+--------+--------+-------")
    
    team_counts = {}
    for iss in all_issues:
        tm = iss['team']
        kd = iss['kind']
        if tm not in team_counts:
            team_counts[tm] = {'build': 0, 'role': 0}
        team_counts[tm][kd] += 1

    for tm in expected_teams:
        b = team_counts[tm]['build']
        r = team_counts[tm]['role']
        t = b + r
        print(f"{tm:<8} | {b:<6} | {r:<6} | {t:<6}")
    print("==================================================")

    # Check for missing fields
    missing_fields_found = False
    required_fields = ['key', 'team', 'member', 'title', 'context_line', 'build', 'depends_on', 'done_when', 'kind']
    for iss in all_issues:
        for f in required_fields:
            val = iss.get(f)
            if val is None or val == "":
                print(f"FAIL: Issue {iss['key']} has missing field '{f}'!", file=sys.stderr)
                missing_fields_found = True

    if build_count != 136 or role_count != 44 or total_count != 180:
        print(f"FATAL ERROR: Count mismatch! Build: {build_count}, Role: {role_count}, Total: {total_count}", file=sys.stderr)
        sys.exit(1)

    if missing_fields_found:
        print("FATAL ERROR: One or more issues have missing required fields!", file=sys.stderr)
        sys.exit(1)

    print("SUCCESS: All counts match exactly (136 build + 44 role = 180) and all required fields are present!")

    # Write scripts/pmo/issues.json
    with open(issues_out_path, 'w', encoding='utf-8') as f:
        json.dump(all_issues, f, indent=2, ensure_ascii=False)
    print(f"Wrote {issues_out_path} ({len(all_issues)} issues)")

    # 6. Write scripts/pmo/members.example.json
    members_example = {}
    for tm in expected_teams:
        members_example[tm] = {
            "member-a": f"username-{tm}-a",
            "member-b": f"username-{tm}-b",
            "member-c": f"username-{tm}-c",
            "member-d": f"username-{tm}-d"
        }
    with open(members_out_path, 'w', encoding='utf-8') as f:
        json.dump(members_example, f, indent=2, ensure_ascii=False)
    print(f"Wrote {members_out_path}")

if __name__ == '__main__':
    main()
