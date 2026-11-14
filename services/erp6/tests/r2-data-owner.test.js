const { describe, it } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const erp6Root = path.resolve(__dirname, '..');
const repoRoot = path.resolve(erp6Root, '../..');

const schemaSql = fs.readFileSync(path.join(erp6Root, 'db/schema.sql'), 'utf8');
const seedSql = fs.readFileSync(path.join(erp6Root, 'db/seed.sql'), 'utf8');
const erDocPath = path.join(repoRoot, 'docs/erp6/er-diagram.md');

describe('[ERP6-R2] Data owner: schema, seed contract & ER diagram verification', () => {
  it('docs/erp6/er-diagram.md exists and contains a 3NF Mermaid ER diagram', () => {
    assert.ok(fs.existsSync(erDocPath), 'docs/erp6/er-diagram.md must exist');
    const erDoc = fs.readFileSync(erDocPath, 'utf8');
    assert.match(erDoc, /```mermaid[\s\S]*erDiagram/);

    const requiredEntities = ['DEPARTMENTS', 'EMPLOYEES', 'ATTENDANCE', 'LEAVE_REQUESTS', 'COMMISSIONS'];
    for (const entity of requiredEntities) {
      assert.ok(erDoc.includes(entity), `ER diagram missing entity ${entity}`);
    }

    assert.match(erDoc, /Third Normal Form \(3NF\)/i);
  });

  it('docs/erp6/er-diagram.md contains a complete Data Dictionary for all 5 tables', () => {
    const erDoc = fs.readFileSync(erDocPath, 'utf8');
    assert.match(erDoc, /\|\s*Column\s*\|\s*Type\s*\|\s*Constraints\s*\|\s*Default\s*\|\s*Description\s*\|/);

    const requiredColumns = [
      'id', 'name', 'created_at',
      'email', 'phone', 'department_id', 'role_title', 'manager_id', 'join_date', 'base_salary', 'active',
      'employee_id', 'date', 'status', 'check_in', 'check_out', 'updated_at',
      'from_date', 'to_date', 'type', 'reason',
      'sales_rep_id', 'invoice_id', 'invoice_amount', 'rate_percent', 'commission_amount', 'month'
    ];
    for (const col of requiredColumns) {
      assert.ok(erDoc.includes(`\`${col}\``), `Data dictionary missing column ${col}`);
    }
  });

  it('schema.sql defines all sequences, tables, constraints, and indexes idempotently', () => {
    const sequences = ['department_seq', 'employee_seq', 'attendance_seq', 'leave_request_seq', 'commission_seq'];
    for (const seq of sequences) {
      assert.match(schemaSql, new RegExp(`CREATE SEQUENCE IF NOT EXISTS ${seq}`, 'i'));
    }

    const tables = ['departments', 'employees', 'attendance', 'leave_requests', 'commissions'];
    for (const tbl of tables) {
      assert.match(schemaSql, new RegExp(`CREATE TABLE IF NOT EXISTS ${tbl}`, 'i'));
    }

    // Sequence ID patterns
    assert.match(schemaSql, /'DEP-' \|\| LPAD\(nextval\('department_seq'\)::TEXT, 2, '0'\)/);
    assert.match(schemaSql, /'EMP-' \|\| LPAD\(nextval\('employee_seq'\)::TEXT, 4, '0'\)/);
    assert.match(schemaSql, /'ATT-' \|\| LPAD\(nextval\('attendance_seq'\)::TEXT, 4, '0'\)/);
    assert.match(schemaSql, /'LV-' \|\| LPAD\(nextval\('leave_request_seq'\)::TEXT, 4, '0'\)/);
    assert.match(schemaSql, /'COMM-' \|\| LPAD\(nextval\('commission_seq'\)::TEXT, 4, '0'\)/);

    // Constraints and uniqueness
    assert.match(schemaSql, /CONSTRAINT uq_attendance_employee_date UNIQUE \(employee_id, date\)/);
    assert.match(schemaSql, /CHECK \(status IN \('present', 'absent', 'half_day', 'leave'\)\)/);
    assert.match(schemaSql, /CHECK \(type IN \('casual', 'sick', 'earned'\)\)/);
  });

  it('seed.sql strictly complies with Section 5 shared seed contract and sequence high-water marks', () => {
    // 5 departments DEP-01 through DEP-05
    for (let i = 1; i <= 5; i += 1) {
      const depId = `DEP-0${i}`;
      assert.ok(seedSql.includes(`'${depId}'`), `Missing canonical department ${depId}`);
    }

    // 12 employees EMP-0001 through EMP-0012
    for (let i = 1; i <= 12; i += 1) {
      const empId = `EMP-${String(i).padStart(4, '0')}`;
      assert.ok(seedSql.includes(`'${empId}'`), `Missing canonical employee ${empId}`);
    }

    // Idempotent upserts on all tables
    assert.ok((seedSql.match(/ON CONFLICT/gi) || []).length >= 5);

    // Sequence high-water marks
    for (const seq of ['department_seq', 'employee_seq', 'attendance_seq', 'leave_request_seq', 'commission_seq']) {
      assert.match(seedSql, new RegExp(`setval\\(\\s*'${seq}'`, 'i'));
    }
  });
});
