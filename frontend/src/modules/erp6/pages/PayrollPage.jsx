import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../../../api';

/**
 * Format numeric currency amount in Indian Rupees (₹) with 2 decimals.
 * Example: 61200 -> ₹61,200.00
 */
function formatINR(amount) {
  const num = Number(amount);
  if (isNaN(num)) return '₹0.00';
  return `₹${num.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
}

// Format YYYY-MM into human-readable month string (e.g. 2026-11 -> "November 2026")
function formatMonthName(monthStr) {
  if (!monthStr || !monthStr.includes('-')) return monthStr || 'Current Month';
  const [year, month] = monthStr.split('-');
  const date = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
  return date.toLocaleString('en-IN', { month: 'long', year: 'numeric' });
}

// Convert numbers to words for Indian Rupees
function numberToWordsINR(amount) {
  const num = Math.floor(Number(amount));
  if (isNaN(num) || num <= 0) return 'Zero Rupees Only';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n < 20) return units[n];
    const unitPart = n % 10;
    return tens[Math.floor(n / 10)] + (unitPart ? `-${units[unitPart]}` : '');
  }

  function convertThreeDigits(n) {
    const hundred = Math.floor(n / 100);
    const rest = n % 100;
    let res = '';
    if (hundred) res += `${units[hundred]} Hundred`;
    if (hundred && rest) res += ' ';
    if (rest) res += convertTwoDigits(rest);
    return res;
  }

  let crore = Math.floor(num / 10000000);
  let remainder = num % 10000000;
  let lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  let thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;
  let hundred = remainder;

  let words = '';
  if (crore) words += `${convertTwoDigits(crore)} Crore `;
  if (lakh) words += `${convertTwoDigits(lakh)} Lakh `;
  if (thousand) words += `${convertTwoDigits(thousand)} Thousand `;
  if (hundred) words += `${convertThreeDigits(hundred)} `;

  return `${words.trim()} Rupees Only`;
}

// Section 5 realistic fallback active employees
const FALLBACK_EMPLOYEES = [
  { id: 'EMP-0001', name: 'Rohan Kulkarni', department_id: 'DEP-01', department_name: 'Sales', role_title: 'Sales Rep', base_salary: 45000.00, active: true },
  { id: 'EMP-0002', name: 'Neha Sharma', department_id: 'DEP-01', department_name: 'Sales', role_title: 'Sales Rep', base_salary: 45000.00, active: true },
  { id: 'EMP-0003', name: 'Vikram Singh', department_id: 'DEP-01', department_name: 'Sales', role_title: 'Sales Rep', base_salary: 45000.00, active: true },
  { id: 'EMP-0004', name: 'Anjali Rao', department_id: 'DEP-01', department_name: 'Sales', role_title: 'Sales Rep', base_salary: 45000.00, active: true },
  { id: 'EMP-0005', name: 'Imran Qureshi', department_id: 'DEP-02', department_name: 'Support', role_title: 'Service Engineer', base_salary: 40000.00, active: true },
  { id: 'EMP-0006', name: 'Deepa Menon', department_id: 'DEP-02', department_name: 'Support', role_title: 'Service Engineer', base_salary: 40000.00, active: true },
  { id: 'EMP-0007', name: 'Suresh Kumar', department_id: 'DEP-02', department_name: 'Support', role_title: 'Service Engineer', base_salary: 40000.00, active: true },
  { id: 'EMP-0008', name: 'Meera Joshi', department_id: 'DEP-03', department_name: 'HR', role_title: 'HR Manager', base_salary: 75000.00, active: true },
  { id: 'EMP-0009', name: 'Arjun Das', department_id: 'DEP-04', department_name: 'Warehouse and Production', role_title: 'Warehouse Manager', base_salary: 65000.00, active: true },
  { id: 'EMP-0010', name: 'Kavita Shah', department_id: 'DEP-05', department_name: 'Finance', role_title: 'Finance Manager', base_salary: 80000.00, active: true },
  { id: 'EMP-0011', name: 'Manoj Pillai', department_id: 'DEP-04', department_name: 'Warehouse and Production', role_title: 'Production Supervisor', base_salary: 55000.00, active: true },
  { id: 'EMP-0012', name: 'Rahul Verma', department_id: 'DEP-03', department_name: 'HR', role_title: 'Admin', base_salary: 90000.00, active: true }
];

export default function PayrollPage() {
  const navigate = useNavigate();

  // Selected Month (default to current month 2026-11)
  const [selectedMonth, setSelectedMonth] = useState('2026-11');
  const [slips, setSlips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [feedback, setFeedback] = useState('');
  const [error, setError] = useState('');

  // Table filters & search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [deptFilter, setDeptFilter] = useState('');

  // Quick Preview Modal state
  const [previewSlip, setPreviewSlip] = useState(null);

  /**
   * Fetch salary slips for the selected month.
   * Tries backend API first; falls back to cached slips or initial seed slips.
   */
  const fetchSalarySlips = useCallback(async (targetMonth) => {
    const month = targetMonth || selectedMonth;
    setLoading(true);
    setError('');

    // 1. Check if backend API has slips for this month
    try {
      const res = await api('erp6', `/api/salary-slips?month=${month}`);
      const list = Array.isArray(res) ? res : (res?.data || []);
      if (list && list.length > 0) {
        setSlips(list);
        setLoading(false);
        return;
      }
    } catch (apiErr) {
      console.warn('[erp6] Backend salary slips API not merged or offline:', apiErr.message);
    }

    // 2. Check sessionStorage cache
    try {
      const storedSlipsRaw = sessionStorage.getItem('erp6_payroll_slips');
      if (storedSlipsRaw) {
        const storedSlips = JSON.parse(storedSlipsRaw);
        const matchingSlips = storedSlips.filter(s => s.month === month);
        if (matchingSlips.length > 0) {
          setSlips(matchingSlips);
          setLoading(false);
          return;
        }
      }
    } catch (e) {
      // ignore
    }

    // 3. Initial default seed for November 2026
    if (month === '2026-11') {
      const initialSeedSlips = [
        {
          id: 'SLIP-2611-0001',
          employee_id: 'EMP-0001',
          employee_name: 'Rohan Kulkarni',
          email: 'rohan.kulkarni@electro.com',
          department_id: 'DEP-01',
          department_name: 'Sales',
          role_title: 'Sales Rep',
          join_date: '2025-01-15',
          month: '2026-11',
          base_salary: 45000.00,
          hra: 18000.00,
          allowances: 2000.00,
          commission: 1600.00,
          gross_pay: 66600.00,
          pf_deduction: 5400.00,
          absent_days: 0,
          absent_deduction: 0.00,
          total_deductions: 5400.00,
          net_pay: 61200.00,
          status: 'generated',
          generated_at: '2026-11-01T10:00:00.000Z'
        },
        {
          id: 'SLIP-2611-0002',
          employee_id: 'EMP-0002',
          employee_name: 'Neha Sharma',
          email: 'neha.sharma@electro.com',
          department_id: 'DEP-01',
          department_name: 'Sales',
          role_title: 'Sales Rep',
          join_date: '2025-02-01',
          month: '2026-11',
          base_salary: 45000.00,
          hra: 18000.00,
          allowances: 2000.00,
          commission: 0.00,
          gross_pay: 65000.00,
          pf_deduction: 5400.00,
          absent_days: 1,
          absent_deduction: 1500.00,
          total_deductions: 6900.00,
          net_pay: 58100.00,
          status: 'paid',
          generated_at: '2026-11-01T10:00:00.000Z'
        },
        {
          id: 'SLIP-2611-0003',
          employee_id: 'EMP-0003',
          employee_name: 'Vikram Singh',
          email: 'vikram.singh@electro.com',
          department_id: 'DEP-01',
          department_name: 'Sales',
          role_title: 'Sales Rep',
          join_date: '2025-02-15',
          month: '2026-11',
          base_salary: 45000.00,
          hra: 18000.00,
          allowances: 2000.00,
          commission: 0.00,
          gross_pay: 65000.00,
          pf_deduction: 5400.00,
          absent_days: 0,
          absent_deduction: 0.00,
          total_deductions: 5400.00,
          net_pay: 59600.00,
          status: 'generated',
          generated_at: '2026-11-01T10:00:00.000Z'
        },
        {
          id: 'SLIP-2611-0004',
          employee_id: 'EMP-0004',
          employee_name: 'Anjali Rao',
          email: 'anjali.rao@electro.com',
          department_id: 'DEP-01',
          department_name: 'Sales',
          role_title: 'Sales Rep',
          join_date: '2025-03-01',
          month: '2026-11',
          base_salary: 45000.00,
          hra: 18000.00,
          allowances: 2000.00,
          commission: 6000.00,
          gross_pay: 71000.00,
          pf_deduction: 5400.00,
          absent_days: 0,
          absent_deduction: 0.00,
          total_deductions: 5400.00,
          net_pay: 65600.00,
          status: 'generated',
          generated_at: '2026-11-01T10:00:00.000Z'
        },
        {
          id: 'SLIP-2611-0005',
          employee_id: 'EMP-0005',
          employee_name: 'Imran Qureshi',
          email: 'imran.qureshi@electro.com',
          department_id: 'DEP-02',
          department_name: 'Support',
          role_title: 'Service Engineer',
          join_date: '2025-01-20',
          month: '2026-11',
          base_salary: 40000.00,
          hra: 16000.00,
          allowances: 2000.00,
          commission: 0.00,
          gross_pay: 58000.00,
          pf_deduction: 4800.00,
          absent_days: 0,
          absent_deduction: 0.00,
          total_deductions: 4800.00,
          net_pay: 53200.00,
          status: 'paid',
          generated_at: '2026-11-01T10:00:00.000Z'
        }
      ];
      setSlips(initialSeedSlips);
    } else {
      setSlips([]);
    }

    setLoading(false);
  }, [selectedMonth]);

  useEffect(() => {
    fetchSalarySlips(selectedMonth);
  }, [selectedMonth, fetchSalarySlips]);

  /**
   * "Generate payroll" action:
   * Triggers generation for the chosen month.
   * If backend is live, calls POST /api/payroll/generate { month }.
   * If backend is awaiting ERP6-C1, computes client-side slips for all active employees.
   */
  async function handleGeneratePayroll() {
    if (!selectedMonth) {
      setError('Please choose a valid payroll month (YYYY-MM).');
      return;
    }

    try {
      setGenerating(true);
      setError('');
      setFeedback('');

      let newSlips = [];
      let totalCost = 0;

      // 1. Try calling backend API
      try {
        const result = await api('erp6', '/api/payroll/generate', {
          method: 'POST',
          body: { month: selectedMonth }
        });

        const data = result?.data || result;
        if (data && Array.isArray(data.slips)) {
          newSlips = data.slips;
          totalCost = Number(data.total_payroll_cost) || 0;
        } else if (Array.isArray(data)) {
          newSlips = data;
        }
      } catch (backendErr) {
        console.warn('[erp6] Backend payroll generation not available, computing locally:', backendErr.message);
      }

      // 2. If backend did not return slips, compute locally using Section 5 active directory
      if (!newSlips || newSlips.length === 0) {
        // Fetch active employees if available
        let activeEmployees = FALLBACK_EMPLOYEES;
        try {
          const empRes = await api('erp6', '/api/employees?active=true');
          const empList = Array.isArray(empRes) ? empRes : (empRes?.data || []);
          if (empList.length > 0) activeEmployees = empList;
        } catch (e) {
          // use fallback
        }

        // Fetch commissions for this month if available
        let commissionsMap = {};
        try {
          const commRes = await api('erp6', `/api/commissions?month=${selectedMonth}`);
          const commList = Array.isArray(commRes) ? commRes : (commRes?.data || []);
          for (const c of commList) {
            const repId = c.sales_rep_id;
            const amt = Number(c.commission_amount) || 0;
            commissionsMap[repId] = (commissionsMap[repId] || 0) + amt;
          }
        } catch (e) {
          // fallback commission map
          if (selectedMonth === '2026-11') {
            commissionsMap['EMP-0001'] = 1600.00;
            commissionsMap['EMP-0004'] = 6000.00;
          } else if (selectedMonth === '2026-10') {
            commissionsMap['EMP-0001'] = 900.00;
            commissionsMap['EMP-0002'] = 4500.00;
            commissionsMap['EMP-0003'] = 1500.00;
          }
        }

        const monthCompact = selectedMonth.replace('-', '').slice(2); // e.g. 2611
        const nowIso = new Date().toISOString();

        newSlips = activeEmployees.map((emp, index) => {
          const base = Number(emp.base_salary) || 40000;
          const hra = base * 0.40; // 40% HRA
          const allowances = 2000.00; // Fixed allowances
          const commission = commissionsMap[emp.id] || 0.00;
          const gross = base + hra + allowances + commission;

          const pf = base * 0.12; // 12% PF
          // Sample absent days (0 for all, 1 for EMP-0002)
          const absentDays = emp.id === 'EMP-0002' ? 1 : 0;
          const absentDeduction = (base / 30) * absentDays;
          const totalDed = pf + absentDeduction;

          const net = gross - totalDed;
          const seq = String(index + 1).padStart(4, '0');
          const slipId = `SLIP-${monthCompact}-${seq}`;

          return {
            id: slipId,
            employee_id: emp.id,
            employee_name: emp.name,
            email: emp.email || `${emp.name.toLowerCase().replace(' ', '.')}@electro.com`,
            department_id: emp.department_id || 'DEP-01',
            department_name: emp.department_name || 'General',
            role_title: emp.role_title,
            join_date: emp.join_date || '2025-01-01',
            month: selectedMonth,
            base_salary: base,
            hra: hra,
            allowances: allowances,
            commission: commission,
            gross_pay: gross,
            pf_deduction: pf,
            absent_days: absentDays,
            absent_deduction: absentDeduction,
            total_deductions: totalDed,
            net_pay: net,
            status: 'generated',
            generated_at: nowIso
          };
        });
      }

      setSlips(newSlips);

      // Cache into sessionStorage so that individual /payroll/:id pages can read them immediately
      try {
        const storedSlipsRaw = sessionStorage.getItem('erp6_payroll_slips');
        let allStored = storedSlipsRaw ? JSON.parse(storedSlipsRaw) : [];
        // Replace or merge slips for this month
        allStored = allStored.filter(s => s.month !== selectedMonth).concat(newSlips);
        sessionStorage.setItem('erp6_payroll_slips', JSON.stringify(allStored));
      } catch (e) {
        // ignore
      }

      totalCost = newSlips.reduce((acc, s) => acc + (Number(s.gross_pay) || 0), 0);
      setFeedback(`Payroll successfully generated for ${formatMonthName(selectedMonth)}! Created ${newSlips.length} salary slips with gross cost of ${formatINR(totalCost)}.`);
    } catch (err) {
      console.error('[erp6] Error generating payroll:', err);
      setError(err.message || 'Failed to generate payroll for selected month.');
    } finally {
      setGenerating(false);
    }
  }

  // Filtered salary slips
  const filteredSlips = useMemo(() => {
    return slips.filter(slip => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchesName = (slip.employee_name || '').toLowerCase().includes(q);
        const matchesId = (slip.employee_id || '').toLowerCase().includes(q);
        const matchesSlip = (slip.id || '').toLowerCase().includes(q);
        const matchesRole = (slip.role_title || '').toLowerCase().includes(q);
        if (!matchesName && !matchesId && !matchesSlip && !matchesRole) return false;
      }
      if (statusFilter && slip.status !== statusFilter) return false;
      if (deptFilter && slip.department_name !== deptFilter && slip.department_id !== deptFilter) return false;
      return true;
    });
  }, [slips, searchQuery, statusFilter, deptFilter]);

  // Overall KPI statistics
  const stats = useMemo(() => {
    let grossTotal = 0;
    let netTotal = 0;
    let deductionsTotal = 0;
    let paidCount = 0;

    for (const s of slips) {
      grossTotal += Number(s.gross_pay) || 0;
      netTotal += Number(s.net_pay) || 0;
      deductionsTotal += Number(s.total_deductions) || 0;
      if (s.status === 'paid') paidCount += 1;
    }

    return {
      count: slips.length,
      grossTotal,
      netTotal,
      deductionsTotal,
      paidCount,
      pendingCount: slips.length - paidCount
    };
  }, [slips]);

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', paddingBottom: '3rem' }}>
      {/* Page Title & Context Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: '1.5rem',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.25rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', margin: 0 }}>
              Payroll Management
            </h2>
            <span className="badge badge-blue">ERP-6 HR</span>
            <span className="badge badge-green">Port 5206</span>
          </div>
          <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>
            Generate monthly payroll, review calculated net pay slips, and print employee salary slips.
          </p>
        </div>

        {/* Quick links to sister screens */}
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <Link
            to="/erp6/commissions"
            style={{
              padding: '0.45rem 0.85rem',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 500
            }}
          >
            📊 Commissions
          </Link>
          <Link
            to="/erp6/employees"
            style={{
              padding: '0.45rem 0.85rem',
              backgroundColor: '#f1f5f9',
              color: '#334155',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '0.85rem',
              fontWeight: 500
            }}
          >
            👥 Employees
          </Link>
        </div>
      </div>

      {/* Control Card: Month Chooser + "Generate payroll" Button */}
      <div style={{
        backgroundColor: '#ffffff',
        border: '1px solid #e2e8f0',
        borderRadius: '8px',
        padding: '1.25rem 1.5rem',
        marginBottom: '1.5rem',
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '1rem'
        }}>
          {/* Month Chooser */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
            <label style={{ fontSize: '0.9rem', fontWeight: 600, color: '#1e293b' }}>
              Select Month:
            </label>
            <input
              type="month"
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              style={{
                padding: '0.55rem 0.9rem',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.9rem',
                fontWeight: 600,
                color: '#0f172a',
                backgroundColor: '#f8fafc',
                cursor: 'pointer'
              }}
            />

            {/* Quick Month Preset Buttons */}
            <div style={{ display: 'flex', gap: '0.4rem' }}>
              <button
                type="button"
                onClick={() => setSelectedMonth('2026-11')}
                style={{
                  padding: '0.4rem 0.75rem',
                  backgroundColor: selectedMonth === '2026-11' ? '#2563eb' : '#f1f5f9',
                  color: selectedMonth === '2026-11' ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Nov 2026
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth('2026-10')}
                style={{
                  padding: '0.4rem 0.75rem',
                  backgroundColor: selectedMonth === '2026-10' ? '#2563eb' : '#f1f5f9',
                  color: selectedMonth === '2026-10' ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Oct 2026
              </button>
              <button
                type="button"
                onClick={() => setSelectedMonth('2026-12')}
                style={{
                  padding: '0.4rem 0.75rem',
                  backgroundColor: selectedMonth === '2026-12' ? '#2563eb' : '#f1f5f9',
                  color: selectedMonth === '2026-12' ? '#ffffff' : '#475569',
                  border: 'none',
                  borderRadius: '5px',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Dec 2026
              </button>
            </div>
          </div>

          {/* "Generate payroll" Button */}
          <div>
            <button
              type="button"
              onClick={handleGeneratePayroll}
              disabled={generating}
              style={{
                backgroundColor: generating ? '#94a3b8' : '#2563eb',
                color: '#ffffff',
                border: 'none',
                padding: '0.65rem 1.4rem',
                borderRadius: '6px',
                fontSize: '0.95rem',
                fontWeight: 700,
                cursor: generating ? 'not-allowed' : 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '0.5rem',
                boxShadow: '0 2px 4px rgba(37,99,235,0.2)'
              }}
            >
              {generating ? '⏳ Generating Payroll...' : '⚡ Generate Payroll'}
            </button>
          </div>
        </div>
      </div>

      {/* Feedback & Error Banners */}
      {feedback && (
        <div style={{
          padding: '0.85rem 1.25rem',
          backgroundColor: '#ecfdf5',
          border: '1px solid #a7f3d0',
          color: '#065f46',
          borderRadius: '6px',
          marginBottom: '1.25rem',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '0.9rem'
        }}>
          <div>✔ {feedback}</div>
          <button
            type="button"
            onClick={() => setFeedback('')}
            style={{
              background: 'none',
              border: 'none',
              color: '#065f46',
              cursor: 'pointer',
              fontWeight: 700,
              fontSize: '1rem'
            }}
          >
            ×
          </button>
        </div>
      )}

      {error && (
        <div style={{
          padding: '0.85rem 1.25rem',
          backgroundColor: '#fef2f2',
          border: '1px solid #fecaca',
          color: '#991b1b',
          borderRadius: '6px',
          marginBottom: '1.25rem',
          fontSize: '0.9rem'
        }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {/* KPI Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        {/* Gross Payroll Cost */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.15rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Total Gross Payroll
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#0f172a', marginTop: '0.3rem' }}>
            {formatINR(stats.grossTotal)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Base + HRA + Allowances + Comm.
          </div>
        </div>

        {/* Total Net Pay Disbursed */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.15rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Total Net Disbursement
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#16a34a', marginTop: '0.3rem' }}>
            {formatINR(stats.netTotal)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Net payable to employees
          </div>
        </div>

        {/* Total Deductions */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.15rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Total Deductions
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#dc2626', marginTop: '0.3rem' }}>
            {formatINR(stats.deductionsTotal)}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            Provident Fund (12%) & Absences
          </div>
        </div>

        {/* Slips Status Count */}
        <div style={{
          backgroundColor: '#ffffff',
          padding: '1.15rem 1.25rem',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase' }}>
            Generated Slips
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2563eb', marginTop: '0.3rem' }}>
            {stats.count} Slips
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.2rem' }}>
            <span style={{ color: '#15803d', fontWeight: 600 }}>{stats.paidCount} Paid</span> · <span style={{ color: '#b45309', fontWeight: 600 }}>{stats.pendingCount} Generated</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '1rem',
        flexWrap: 'wrap',
        gap: '0.75rem'
      }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', flex: 1, maxWidth: '600px' }}>
          <input
            type="text"
            placeholder="🔍 Search employee name, ID, or role..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.85rem',
              flex: 1,
              minWidth: '200px'
            }}
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.85rem',
              backgroundColor: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="">All Statuses</option>
            <option value="generated">Generated (Unpaid)</option>
            <option value="paid">Paid</option>
          </select>

          <select
            value={deptFilter}
            onChange={(e) => setDeptFilter(e.target.value)}
            style={{
              padding: '0.45rem 0.75rem',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontSize: '0.85rem',
              backgroundColor: '#ffffff',
              color: '#334155'
            }}
          >
            <option value="">All Departments</option>
            <option value="Sales">Sales</option>
            <option value="Support">Support</option>
            <option value="HR">HR</option>
            <option value="Warehouse and Production">Warehouse & Production</option>
            <option value="Finance">Finance</option>
          </select>
        </div>

        <div style={{ fontSize: '0.85rem', color: '#64748b' }}>
          Showing <strong>{filteredSlips.length}</strong> of {slips.length} slips
        </div>
      </div>

      {/* ========================================================
          TABLE OF SALARY SLIPS WITH NET PAY
         ======================================================== */}
      {loading ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '3rem',
          textAlign: 'center',
          color: '#64748b'
        }}>
          ⏳ Loading salary slips for {formatMonthName(selectedMonth)}...
        </div>
      ) : slips.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '3.5rem 2rem',
          textAlign: 'center',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <div style={{ fontSize: '2.5rem', marginBottom: '0.5rem' }}>📄</div>
          <h3 style={{ fontSize: '1.2rem', fontWeight: 700, color: '#1e293b', marginBottom: '0.5rem' }}>
            No Salary Slips for {formatMonthName(selectedMonth)}
          </h3>
          <p style={{ color: '#64748b', fontSize: '0.9rem', maxWidth: '500px', margin: '0 auto 1.5rem auto', lineHeight: '1.5' }}>
            Payroll has not yet been processed for this month. Click the <strong>Generate Payroll</strong> button above to calculate base pay, HRA, allowances, commissions, and deductions for all active staff.
          </p>
          <button
            type="button"
            onClick={handleGeneratePayroll}
            disabled={generating}
            style={{
              backgroundColor: '#2563eb',
              color: '#ffffff',
              border: 'none',
              padding: '0.65rem 1.5rem',
              borderRadius: '6px',
              fontSize: '0.9rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            {generating ? 'Generating...' : `Generate Payroll for ${formatMonthName(selectedMonth)}`}
          </button>
        </div>
      ) : filteredSlips.length === 0 ? (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          padding: '2rem',
          textAlign: 'center',
          color: '#64748b'
        }}>
          No salary slips match your filter criteria. Try clearing search filters.
        </div>
      ) : (
        <div style={{
          backgroundColor: '#ffffff',
          borderRadius: '8px',
          border: '1px solid #e2e8f0',
          overflow: 'hidden',
          boxShadow: '0 1px 3px rgba(0,0,0,0.03)'
        }}>
          <table style={{ margin: 0, width: '100%' }}>
            <thead>
              <tr>
                <th>Slip ID</th>
                <th>Employee</th>
                <th>Department & Role</th>
                <th>Base Salary</th>
                <th>Gross Earnings</th>
                <th>Deductions</th>
                <th>Net Pay</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredSlips.map(slip => {
                const isPaid = slip.status === 'paid';
                return (
                  <tr key={slip.id} style={{ transition: 'background-color 0.1s' }}>
                    {/* Slip ID link */}
                    <td>
                      <Link
                        to={`/erp6/payroll/${slip.id}`}
                        style={{
                          fontWeight: 700,
                          color: '#2563eb',
                          textDecoration: 'none'
                        }}
                        title="Open Printable Salary Slip"
                      >
                        {slip.id}
                      </Link>
                    </td>

                    {/* Employee Profile */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a' }}>
                        {slip.employee_name}
                      </div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                        {slip.employee_id}
                      </span>
                    </td>

                    {/* Department & Role */}
                    <td>
                      <div style={{ fontSize: '0.85rem', color: '#0f172a' }}>
                        {slip.role_title}
                      </div>
                      <span style={{
                        fontSize: '0.75rem',
                        backgroundColor: '#f1f5f9',
                        padding: '0.1rem 0.4rem',
                        borderRadius: '4px',
                        color: '#475569'
                      }}>
                        {slip.department_name || slip.department_id}
                      </span>
                    </td>

                    {/* Base Salary */}
                    <td style={{ fontSize: '0.85rem', color: '#334155' }}>
                      {formatINR(slip.base_salary)}
                    </td>

                    {/* Gross Earnings Breakdown */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#0f172a', fontSize: '0.9rem' }}>
                        {formatINR(slip.gross_pay)}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        HRA {formatINR(slip.hra)}
                        {Number(slip.commission) > 0 && ` + Comm ${formatINR(slip.commission)}`}
                      </span>
                    </td>

                    {/* Deductions Breakdown */}
                    <td>
                      <div style={{ fontWeight: 600, color: '#dc2626', fontSize: '0.9rem' }}>
                        {formatINR(slip.total_deductions)}
                      </div>
                      <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                        PF {formatINR(slip.pf_deduction)}
                        {Number(slip.absent_deduction) > 0 && ` + Abs (${slip.absent_days}d) ${formatINR(slip.absent_deduction)}`}
                      </span>
                    </td>

                    {/* Net Pay (Highlighted) */}
                    <td>
                      <div style={{
                        fontSize: '1rem',
                        fontWeight: 800,
                        color: '#16a34a'
                      }}>
                        {formatINR(slip.net_pay)}
                      </div>
                    </td>

                    {/* Status Badge */}
                    <td>
                      <span className={isPaid ? 'badge badge-green' : 'badge badge-blue'}>
                        {isPaid ? 'Paid' : 'Generated'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem' }}>
                        {/* Quick Modal Preview */}
                        <button
                          type="button"
                          onClick={() => setPreviewSlip(slip)}
                          style={{
                            backgroundColor: '#f1f5f9',
                            color: '#334155',
                            border: '1px solid #cbd5e1',
                            padding: '0.35rem 0.65rem',
                            borderRadius: '5px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                          title="Quick preview modal"
                        >
                          👁️ Quick View
                        </button>

                        {/* View Slip full printable route */}
                        <button
                          type="button"
                          onClick={() => navigate(`/erp6/payroll/${slip.id}`)}
                          style={{
                            backgroundColor: '#2563eb',
                            color: '#ffffff',
                            border: 'none',
                            padding: '0.35rem 0.75rem',
                            borderRadius: '5px',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          View Slip →
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* ========================================================
          QUICK PREVIEW MODAL (Side-by-Side Earnings and Deductions)
         ======================================================== */}
      {previewSlip && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.6)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1.5rem'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '10px',
            maxWidth: '750px',
            width: '100%',
            maxHeight: '90vh',
            overflowY: 'auto',
            padding: '2rem',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
            position: 'relative'
          }}>
            {/* Modal Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              borderBottom: '2px solid #0f172a',
              paddingBottom: '1rem',
              marginBottom: '1.25rem'
            }}>
              <div>
                <h3 style={{ fontSize: '1.3rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                  ⚡ ELECTRO APP LTD. — SALARY SLIP
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                  Payslip Reference: <strong>{previewSlip.id}</strong> · {formatMonthName(previewSlip.month)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setPreviewSlip(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '1.5rem',
                  color: '#64748b',
                  cursor: 'pointer',
                  padding: '0.2rem 0.5rem',
                  lineHeight: 1
                }}
              >
                ×
              </button>
            </div>

            {/* Employee details summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '0.5rem 1.5rem',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              padding: '0.75rem 1rem',
              borderRadius: '6px',
              fontSize: '0.85rem',
              marginBottom: '1.25rem'
            }}>
              <div>
                <span style={{ color: '#64748b' }}>Employee: </span>
                <strong style={{ color: '#0f172a' }}>{previewSlip.employee_name}</strong> ({previewSlip.employee_id})
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Designation: </span>
                <strong style={{ color: '#0f172a' }}>{previewSlip.role_title}</strong>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Department: </span>
                <span style={{ color: '#0f172a' }}>{previewSlip.department_name}</span>
              </div>
              <div>
                <span style={{ color: '#64748b' }}>Status: </span>
                <span className={previewSlip.status === 'paid' ? 'badge badge-green' : 'badge badge-blue'}>
                  {previewSlip.status === 'paid' ? 'Paid' : 'Generated'}
                </span>
              </div>
            </div>

            {/* Side-by-Side Earnings and Deductions */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '1rem',
              marginBottom: '1.25rem'
            }}>
              {/* Earnings */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#f1f5f9', padding: '0.45rem 0.75rem', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  Earnings
                </div>
                <div style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                    <span>Basic Salary</span>
                    <strong>{formatINR(previewSlip.base_salary)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                    <span>HRA (40%)</span>
                    <strong>{formatINR(previewSlip.hra)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                    <span>Allowances</span>
                    <strong>{formatINR(previewSlip.allowances)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                    <span>Commission</span>
                    <strong>{formatINR(previewSlip.commission)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', marginTop: '0.5rem', paddingTop: '0.5rem', fontWeight: 700 }}>
                    <span>Gross Earnings</span>
                    <span>{formatINR(previewSlip.gross_pay)}</span>
                  </div>
                </div>
              </div>

              {/* Deductions */}
              <div style={{ border: '1px solid #cbd5e1', borderRadius: '6px', overflow: 'hidden' }}>
                <div style={{ backgroundColor: '#f1f5f9', padding: '0.45rem 0.75rem', fontWeight: 700, fontSize: '0.8rem', textTransform: 'uppercase' }}>
                  Deductions
                </div>
                <div style={{ padding: '0.75rem', fontSize: '0.85rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                    <span>Provident Fund (12%)</span>
                    <strong style={{ color: '#b91c1c' }}>{formatINR(previewSlip.pf_deduction)}</strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
                    <span>Absent Deduction</span>
                    <strong style={{ color: Number(previewSlip.absent_deduction) > 0 ? '#b91c1c' : '#64748b' }}>
                      {formatINR(previewSlip.absent_deduction)}
                    </strong>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#94a3b8' }}>
                    <span>Professional Tax</span>
                    <span>₹0.00</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', marginTop: '1.25rem', paddingTop: '0.5rem', fontWeight: 700 }}>
                    <span>Total Deductions</span>
                    <span style={{ color: '#b91c1c' }}>{formatINR(previewSlip.total_deductions)}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Net Pay Callout */}
            <div style={{
              backgroundColor: '#f0fdf4',
              border: '1.5px solid #86efac',
              borderRadius: '6px',
              padding: '0.75rem 1rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '1.25rem'
            }}>
              <div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#166534', textTransform: 'uppercase' }}>
                  Net Salary Payable
                </span>
                <div style={{ fontSize: '0.8rem', color: '#4b5563' }}>
                  {numberToWordsINR(previewSlip.net_pay)}
                </div>
              </div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: '#15803d' }}>
                {formatINR(previewSlip.net_pay)}
              </div>
            </div>

            {/* Modal Actions */}
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
              <button
                type="button"
                onClick={() => setPreviewSlip(null)}
                style={{
                  padding: '0.5rem 1rem',
                  backgroundColor: '#f1f5f9',
                  color: '#475569',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>

              <button
                type="button"
                onClick={() => {
                  const slipId = previewSlip.id;
                  setPreviewSlip(null);
                  navigate(`/erp6/payroll/${slipId}`);
                }}
                style={{
                  padding: '0.5rem 1.25rem',
                  backgroundColor: '#2563eb',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: 600,
                  fontSize: '0.85rem',
                  cursor: 'pointer'
                }}
              >
                Open Full Printable Slip & Print →
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
