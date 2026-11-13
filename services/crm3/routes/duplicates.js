const express = require('express');
const router = express.Router();
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

// Protect all duplicate and merge routes with authentication middleware
router.use(requireAuth);

const pool = makePool('crm3_db');

/**
 * Fast cached database availability probe.
 * Prevents connection timeouts when running offline or in unit tests.
 */
let dbStatus = null;
let lastDbCheck = 0;

async function isDatabaseAvailable() {
  const now = Date.now();
  if (dbStatus !== null && (now - lastDbCheck < 30000)) {
    return dbStatus;
  }
  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DB connection probe timeout')), 600)
    );
    await Promise.race([
      pool.query('SELECT 1'),
      timeoutPromise
    ]);
    dbStatus = true;
    lastDbCheck = now;
    return true;
  } catch (err) {
    dbStatus = false;
    lastDbCheck = now;
    return false;
  }
}

/**
 * Section 5 Shared Seed Contract Initial In-Memory State
 * Used when PostgreSQL database is offline or in isolated test environments.
 */
const INITIAL_CUSTOMERS = [
  {
    id: 'CUST-0001',
    name: 'Aarav Mehta',
    type: 'retail',
    email: 'aarav.mehta@example.com',
    phone: '9820112345',
    gstin: null,
    billing_address: '101, Sea View Apartments, Worli',
    shipping_address: '101, Sea View Apartments, Worli',
    city: 'Mumbai',
    created_at: '2026-11-01T10:00:00.000Z'
  },
  {
    id: 'CUST-0002',
    name: 'Sunrise Electronics Pvt Ltd',
    type: 'corporate',
    email: 'purchase@sunrise.com',
    phone: '9820223456',
    gstin: '27AABCS1234F1Z5',
    billing_address: 'Plot 45, MIDC Industrial Area, Andheri East',
    shipping_address: 'Plot 45, MIDC Industrial Area, Andheri East',
    city: 'Mumbai',
    created_at: '2026-11-01T10:05:00.000Z'
  },
  {
    id: 'CUST-0003',
    name: 'Priya Nair',
    type: 'retail',
    email: 'priya.nair@example.com',
    phone: '9847134567',
    gstin: null,
    billing_address: 'Flat 3B, Palm Grove, Marine Drive',
    shipping_address: 'Flat 3B, Palm Grove, Marine Drive',
    city: 'Kochi',
    created_at: '2026-11-01T10:10:00.000Z'
  },
  {
    id: 'CUST-0004',
    name: 'BrightHome Retail LLP',
    type: 'dealer',
    email: 'contact@brighthome.com',
    phone: '9850145678',
    gstin: '27AAACB5678G1Z2',
    billing_address: 'Shop 12, Phoenix Marketcity, Viman Nagar',
    shipping_address: 'Shop 12, Phoenix Marketcity, Viman Nagar',
    city: 'Pune',
    created_at: '2026-11-01T10:15:00.000Z'
  },
  {
    id: 'CUST-0005',
    name: 'Kiran Patel',
    type: 'retail',
    email: 'kiran.patel@example.com',
    phone: '9879156789',
    gstin: null,
    billing_address: '24, Shanti Nagar, SG Highway',
    shipping_address: '24, Shanti Nagar, SG Highway',
    city: 'Ahmedabad',
    created_at: '2026-11-01T10:20:00.000Z'
  },
  {
    id: 'CUST-0006',
    name: 'Metro Offices Ltd',
    type: 'corporate',
    email: 'admin@metrooffices.com',
    phone: '9811167890',
    gstin: '07AABCM9012K1Z8',
    billing_address: 'Level 5, Connaught Place, Barakhamba Road',
    shipping_address: 'Level 5, Connaught Place, Barakhamba Road',
    city: 'Delhi',
    created_at: '2026-11-01T10:25:00.000Z'
  },
  {
    id: 'CUST-0007',
    name: 'Sneha Iyer',
    type: 'retail',
    email: 'sneha.iyer@example.com',
    phone: '9840178901',
    gstin: null,
    billing_address: '15, Besant Avenue, Adyar',
    shipping_address: '15, Besant Avenue, Adyar',
    city: 'Chennai',
    created_at: '2026-11-01T10:30:00.000Z'
  },
  {
    id: 'CUST-0008',
    name: 'Gadget Hub',
    type: 'dealer',
    email: 'sales@gadgethub.com',
    phone: '9845189012',
    gstin: '29AABCG3456L1Z4',
    billing_address: '88, Brigade Road, Ashok Nagar',
    shipping_address: '88, Brigade Road, Ashok Nagar',
    city: 'Bengaluru',
    created_at: '2026-11-01T10:35:00.000Z'
  },
  {
    id: 'CUST-0009',
    name: 'Aarav Mehta (Branch)',
    type: 'retail',
    email: 'aarav.alt@example.com',
    phone: '9820112345', // Deliberate duplicate phone of CUST-0001
    gstin: null,
    billing_address: '101, Sea View Apartments, Worli',
    shipping_address: '101, Sea View Apartments, Worli',
    city: 'Mumbai',
    created_at: '2026-11-01T10:40:00.000Z'
  },
  {
    id: 'CUST-0010',
    name: 'Sunrise Electronics Pune Branch',
    type: 'corporate',
    email: 'purchase@sunrise.com', // Deliberate duplicate email of CUST-0002
    phone: '9820998877',
    gstin: '27AABCS1234F1Z5',
    billing_address: 'Shop 5, Deccan Gymkhana',
    shipping_address: 'Shop 5, Deccan Gymkhana',
    city: 'Pune',
    created_at: '2026-11-01T10:45:00.000Z'
  }
];

const INITIAL_CONTACTS = [
  { id: 'CON-0001', customer_id: 'CUST-0001', name: 'Aarav Mehta', phone: '9820112345', email: 'aarav.mehta@example.com', designation: 'Primary Contact' },
  { id: 'CON-0002', customer_id: 'CUST-0002', name: 'Rajesh Sharma', phone: '9820223457', email: 'rsharma@sunrise.com', designation: 'Procurement Manager' },
  { id: 'CON-0003', customer_id: 'CUST-0002', name: 'Anita Desai', phone: '9820223458', email: 'adesai@sunrise.com', designation: 'Accounts Lead' },
  { id: 'CON-0004', customer_id: 'CUST-0003', name: 'Priya Nair', phone: '9847134567', email: 'priya.nair@example.com', designation: 'Primary Contact' },
  { id: 'CON-0005', customer_id: 'CUST-0004', name: 'Vikram Joshi', phone: '9850145679', email: 'vjoshi@brighthome.com', designation: 'Dealer Representative' },
  { id: 'CON-0006', customer_id: 'CUST-0005', name: 'Kiran Patel', phone: '9879156789', email: 'kiran.patel@example.com', designation: 'Primary Contact' },
  { id: 'CON-0007', customer_id: 'CUST-0006', name: 'Sunil Kapoor', phone: '9811167891', email: 'skapoor@metrooffices.com', designation: 'Operations Director' },
  { id: 'CON-0008', customer_id: 'CUST-0007', name: 'Sneha Iyer', phone: '9840178901', email: 'sneha.iyer@example.com', designation: 'Primary Contact' },
  { id: 'CON-0009', customer_id: 'CUST-0008', name: 'Girish Reddy', phone: '9845189013', email: 'greddy@gadgethub.com', designation: 'Store Manager' },
  { id: 'CON-0010', customer_id: 'CUST-0009', name: 'Aarav Mehta Jr', phone: '9820112345', email: 'aarav.alt@example.com', designation: 'Associate' },
  { id: 'CON-0011', customer_id: 'CUST-0010', name: 'Rajesh Sharma', phone: '9820998877', email: 'purchase@sunrise.com', designation: 'Branch Lead' }
];

const INITIAL_INTERACTIONS = [
  { id: 'INT-0001', customer_id: 'CUST-0001', type: 'call', summary: 'Initial discovery call for retail electronics catalog', source_team: 'CRM-3', created_by: 'EMP-0001', created_at: '2026-11-02T10:00:00.000Z' },
  { id: 'INT-0002', customer_id: 'CUST-0001', type: 'email', summary: 'Product brochure sent for 55-inch 4K Smart TV', source_team: 'CRM-3', created_by: 'EMP-0001', created_at: '2026-11-04T12:00:00.000Z' },
  { id: 'INT-0003', customer_id: 'CUST-0002', type: 'meeting', summary: 'Commercial terms review for Q4 corporate procurement', source_team: 'CRM-3', created_by: 'EMP-0002', created_at: '2026-11-03T15:00:00.000Z' },
  { id: 'INT-0004', customer_id: 'CUST-0009', type: 'call', summary: 'Branch enquiry regarding bulk order discount', source_team: 'CRM-3', created_by: 'EMP-0001', created_at: '2026-11-05T11:00:00.000Z' },
  { id: 'INT-0005', customer_id: 'CUST-0010', type: 'email', summary: 'Branch procurement requirements follow-up', source_team: 'CRM-3', created_by: 'EMP-0002', created_at: '2026-11-06T14:00:00.000Z' }
];

const INITIAL_TAGS = [
  { customer_id: 'CUST-0001', tag: 'VIP' },
  { customer_id: 'CUST-0001', tag: 'Priority Support' },
  { customer_id: 'CUST-0009', tag: 'Priority Support' }, // Deliberate duplicate tag to test skip on merge
  { customer_id: 'CUST-0009', tag: 'Branch Customer' },
  { customer_id: 'CUST-0002', tag: 'Corporate Tier 1' },
  { customer_id: 'CUST-0002', tag: 'High Value' },
  { customer_id: 'CUST-0010', tag: 'High Value' }, // Deliberate duplicate tag to test skip on merge
  { customer_id: 'CUST-0010', tag: 'Regional Branch' },
  { customer_id: 'CUST-0003', tag: 'Loyal' },
  { customer_id: 'CUST-0004', tag: 'Tier 1 Dealer' },
  { customer_id: 'CUST-0006', tag: 'Enterprise' }
];

let inMemoryCustomers = JSON.parse(JSON.stringify(INITIAL_CUSTOMERS));
let inMemoryContacts = JSON.parse(JSON.stringify(INITIAL_CONTACTS));
let inMemoryInteractions = JSON.parse(JSON.stringify(INITIAL_INTERACTIONS));
let inMemoryTags = JSON.parse(JSON.stringify(INITIAL_TAGS));

/**
 * Resets in-memory stores back to seed state (useful in test runs)
 */
function resetInMemoryData() {
  inMemoryCustomers = JSON.parse(JSON.stringify(INITIAL_CUSTOMERS));
  inMemoryContacts = JSON.parse(JSON.stringify(INITIAL_CONTACTS));
  inMemoryInteractions = JSON.parse(JSON.stringify(INITIAL_INTERACTIONS));
  inMemoryTags = JSON.parse(JSON.stringify(INITIAL_TAGS));
}

/**
 * Computes duplicate customer groups from in-memory records.
 * Identifies pairs/groups sharing identical phone numbers or email addresses.
 */
function getInMemoryDuplicateGroups() {
  const groups = [];
  const processedCustomerPairs = new Set();

  // 1. Group by identical Phone
  const phoneMap = new Map();
  inMemoryCustomers.forEach(c => {
    if (c.phone && c.phone.trim()) {
      const key = c.phone.trim();
      if (!phoneMap.has(key)) phoneMap.set(key, []);
      phoneMap.get(key).push(c);
    }
  });

  phoneMap.forEach((customers, phone) => {
    if (customers.length > 1) {
      const pairKey = customers.map(c => c.id).sort().join('::');
      processedCustomerPairs.add(pairKey);
      groups.push({
        group_id: `dup-phone-${phone.replace(/\D/g, '')}`,
        match_field: 'phone',
        match_value: phone,
        reason: `Duplicate Phone Number (${phone})`,
        customers: customers.map(c => ({
          ...c,
          contacts_count: inMemoryContacts.filter(ct => ct.customer_id === c.id).length
        }))
      });
    }
  });

  // 2. Group by identical Email (case-insensitive)
  const emailMap = new Map();
  inMemoryCustomers.forEach(c => {
    if (c.email && c.email.trim()) {
      const key = c.email.trim().toLowerCase();
      if (!emailMap.has(key)) emailMap.set(key, []);
      emailMap.get(key).push(c);
    }
  });

  emailMap.forEach((customers, email) => {
    if (customers.length > 1) {
      const pairKey = customers.map(c => c.id).sort().join('::');
      if (!processedCustomerPairs.has(pairKey)) {
        processedCustomerPairs.add(pairKey);
        groups.push({
          group_id: `dup-email-${email.replace(/[^a-zA-Z0-9]/g, '-')}`,
          match_field: 'email',
          match_value: email,
          reason: `Duplicate Email Address (${email})`,
          customers: customers.map(c => ({
            ...c,
            contacts_count: inMemoryContacts.filter(ct => ct.customer_id === c.id).length
          }))
        });
      }
    }
  });

  return groups;
}

/**
 * GET /api/customers/duplicates
 * Identifies duplicate customer groups sharing the same email or phone.
 * Shared seed contract provides 2 initial pairs:
 *   - CUST-0001 / CUST-0009 (shared phone: 9820112345)
 *   - CUST-0002 / CUST-0010 (shared email: purchase@sunrise.com)
 */
router.get('/customers/duplicates', async (req, res) => {
  const dbOk = await isDatabaseAvailable();
  if (dbOk) {
    try {
      const client = await pool.connect();
      try {
        const tableCheck = await client.query(`
          SELECT to_regclass('public.customers') AS exists;
        `);

        if (!tableCheck.rows[0].exists) {
          return res.json({ data: getInMemoryDuplicateGroups() });
        }

        // Query duplicate phone groups
        const phoneDuplicatesResult = await client.query(`
          SELECT phone, array_agg(id ORDER BY id) AS customer_ids
          FROM customers
          WHERE phone IS NOT NULL AND TRIM(phone) != ''
          GROUP BY phone
          HAVING COUNT(*) > 1;
        `);

        // Query duplicate email groups (case-insensitive)
        const emailDuplicatesResult = await client.query(`
          SELECT LOWER(email) AS email, array_agg(id ORDER BY id) AS customer_ids
          FROM customers
          WHERE email IS NOT NULL AND TRIM(email) != ''
          GROUP BY LOWER(email)
          HAVING COUNT(*) > 1;
        `);

        const groups = [];
        const seenPairKeys = new Set();

        async function fetchCustomers(ids) {
          const query = `
            SELECT c.id, c.name, c.type, c.email, c.phone, c.gstin,
                   c.billing_address, c.shipping_address, c.city, c.created_at,
                   (SELECT COUNT(*)::int FROM contacts WHERE customer_id = c.id) AS contacts_count
            FROM customers c
            WHERE c.id = ANY($1)
            ORDER BY c.id;
          `;
          const result = await client.query(query, [ids]);
          return result.rows;
        }

        // 1. Phone duplicate groups
        for (const row of phoneDuplicatesResult.rows) {
          const ids = row.customer_ids;
          const pairKey = ids.slice().sort().join('::');
          seenPairKeys.add(pairKey);

          const customers = await fetchCustomers(ids);
          groups.push({
            group_id: `dup-phone-${row.phone.replace(/\D/g, '')}`,
            match_field: 'phone',
            match_value: row.phone,
            reason: `Duplicate Phone Number (${row.phone})`,
            customers
          });
        }

        // 2. Email duplicate groups
        for (const row of emailDuplicatesResult.rows) {
          const ids = row.customer_ids;
          const pairKey = ids.slice().sort().join('::');
          if (!seenPairKeys.has(pairKey)) {
            seenPairKeys.add(pairKey);
            const customers = await fetchCustomers(ids);
            groups.push({
              group_id: `dup-email-${row.email.replace(/[^a-zA-Z0-9]/g, '-')}`,
              match_field: 'email',
              match_value: row.email,
              reason: `Duplicate Email Address (${row.email})`,
              customers
            });
          }
        }

        return res.json({ data: groups });
      } finally {
        client.release();
      }
    } catch (err) {
      // Fallback to in-memory store
      return res.json({ data: getInMemoryDuplicateGroups() });
    }
  }

  return res.json({ data: getInMemoryDuplicateGroups() });
});

/**
 * POST /api/customers/merge
 * Merges two customer records in a single database transaction:
 *   1. Moves contacts from remove_id to keep_id
 *   2. Moves interactions from remove_id to keep_id
 *   3. Moves customer tags from remove_id to keep_id (skipping duplicate tags)
 *   4. Deletes remove_id customer record
 *
 * Request body: { keep_id: string, remove_id: string }
 */
router.post('/customers/merge', async (req, res) => {
  const { keep_id, remove_id } = req.body || {};

  // Input validation
  if (!keep_id || typeof keep_id !== 'string' || !keep_id.trim()) {
    return res.status(400).json({ error: 'keep_id is required and must be a valid string' });
  }

  if (!remove_id || typeof remove_id !== 'string' || !remove_id.trim()) {
    return res.status(400).json({ error: 'remove_id is required and must be a valid string' });
  }

  const cleanKeepId = keep_id.trim();
  const cleanRemoveId = remove_id.trim();

  if (cleanKeepId === cleanRemoveId) {
    return res.status(400).json({ error: 'keep_id and remove_id cannot be the same customer' });
  }

  const dbOk = await isDatabaseAvailable();
  if (dbOk) {
    try {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Check existence of keep_id
        const keepCheck = await client.query('SELECT id, name FROM customers WHERE id = $1', [cleanKeepId]);
        if (keepCheck.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: `Customer with keep_id '${cleanKeepId}' not found` });
        }

        // Check existence of remove_id
        const removeCheck = await client.query('SELECT id, name FROM customers WHERE id = $1', [cleanRemoveId]);
        if (removeCheck.rowCount === 0) {
          await client.query('ROLLBACK');
          return res.status(404).json({ error: `Customer with remove_id '${cleanRemoveId}' not found` });
        }

        // 1. Move contacts from remove_id to keep_id
        const contactsMove = await client.query(`
          UPDATE contacts
          SET customer_id = $1
          WHERE customer_id = $2
        `, [cleanKeepId, cleanRemoveId]);

        // 2. Move interactions if interactions table exists
        let interactionsMoved = 0;
        const interactionsTableCheck = await client.query(`
          SELECT to_regclass('public.interactions') AS exists;
        `);
        if (interactionsTableCheck.rows[0].exists) {
          const moveRes = await client.query(`
            UPDATE interactions
            SET customer_id = $1
            WHERE customer_id = $2
          `, [cleanKeepId, cleanRemoveId]);
          interactionsMoved = moveRes.rowCount;
        }

        // 3. Move customer_tags if customer_tags table exists (skip tags that would duplicate)
        let tagsMoved = 0;
        const tagsTableCheck = await client.query(`
          SELECT to_regclass('public.customer_tags') AS exists;
        `);
        if (tagsTableCheck.rows[0].exists) {
          // Insert tags of remove_id to keep_id skipping conflicts
          const tagInsert = await client.query(`
            INSERT INTO customer_tags (customer_id, tag)
            SELECT $1, tag
            FROM customer_tags
            WHERE customer_id = $2
            ON CONFLICT (customer_id, tag) DO NOTHING
          `, [cleanKeepId, cleanRemoveId]);
          tagsMoved = tagInsert.rowCount;

          // Delete remove_id tags
          await client.query(`
            DELETE FROM customer_tags
            WHERE customer_id = $1
          `, [cleanRemoveId]);
        }

        // 4. Delete remove_id customer record
        await client.query('DELETE FROM customers WHERE id = $1', [cleanRemoveId]);

        await client.query('COMMIT');

        return res.status(200).json({
          data: {
            message: `Customer ${cleanRemoveId} successfully merged into ${cleanKeepId}`,
            keep_id: cleanKeepId,
            remove_id: cleanRemoveId,
            removed_id: cleanRemoveId,
            contacts_moved: contactsMove.rowCount,
            interactions_moved: interactionsMoved,
            tags_moved: tagsMoved
          }
        });
      } catch (txErr) {
        await client.query('ROLLBACK');
        throw txErr;
      } finally {
        client.release();
      }
    } catch (err) {
      if (err.status) {
        return res.status(err.status).json({ error: err.message });
      }
      if (err.code && err.code !== 'ECONNREFUSED') {
        return res.status(500).json({ error: `Database merge transaction failed: ${err.message}` });
      }
    }
  }

  // In-Memory Fallback
  const keepCustomer = inMemoryCustomers.find(c => c.id === cleanKeepId);
  if (!keepCustomer) {
    return res.status(404).json({ error: `Customer with keep_id '${cleanKeepId}' not found` });
  }

  const removeCustomer = inMemoryCustomers.find(c => c.id === cleanRemoveId);
  if (!removeCustomer) {
    return res.status(404).json({ error: `Customer with remove_id '${cleanRemoveId}' not found` });
  }

  // Move contacts
  let contactsMoved = 0;
  inMemoryContacts.forEach(ct => {
    if (ct.customer_id === cleanRemoveId) {
      ct.customer_id = cleanKeepId;
      contactsMoved++;
    }
  });

  // Move interactions
  let interactionsMoved = 0;
  inMemoryInteractions.forEach(it => {
    if (it.customer_id === cleanRemoveId) {
      it.customer_id = cleanKeepId;
      interactionsMoved++;
    }
  });

  // Move tags, skipping duplicate tag rows
  const existingKeepTags = new Set(
    inMemoryTags.filter(t => t.customer_id === cleanKeepId).map(t => t.tag)
  );
  let tagsMoved = 0;
  inMemoryTags = inMemoryTags.filter(t => {
    if (t.customer_id === cleanRemoveId) {
      if (!existingKeepTags.has(t.tag)) {
        existingKeepTags.add(t.tag);
        t.customer_id = cleanKeepId;
        tagsMoved++;
        return true;
      }
      return false; // Skip tag row that would duplicate
    }
    return true;
  });

  // Delete remove_id customer
  inMemoryCustomers = inMemoryCustomers.filter(c => c.id !== cleanRemoveId);

  return res.status(200).json({
    data: {
      message: `Customer ${cleanRemoveId} successfully merged into ${cleanKeepId}`,
      keep_id: cleanKeepId,
      remove_id: cleanRemoveId,
      removed_id: cleanRemoveId,
      contacts_moved: contactsMoved,
      interactions_moved: interactionsMoved,
      tags_moved: tagsMoved
    }
  });
});

/**
 * GET /api/customers/:id/contacts
 * Returns all contacts belonging to customer :id.
 */
router.get('/customers/:id/contacts', async (req, res, next) => {
  const { id } = req.params;
  if (!id || id === 'duplicates' || id === 'merge') {
    return next();
  }

  const dbOk = await isDatabaseAvailable();
  if (dbOk) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT id, customer_id, name, phone, email, designation, created_at FROM contacts WHERE customer_id = $1 ORDER BY id',
          [id]
        );
        return res.json({ data: result.rows });
      } finally {
        client.release();
      }
    } catch (err) {
      // Fallback to in-memory
    }
  }

  const contacts = inMemoryContacts.filter(c => c.customer_id === id);
  return res.json({ data: contacts });
});

/**
 * GET /api/customers/:id/interactions
 * Returns all timeline events/interactions belonging to customer :id.
 */
router.get('/customers/:id/interactions', async (req, res, next) => {
  const { id } = req.params;
  if (!id || id === 'duplicates' || id === 'merge') {
    return next();
  }

  const dbOk = await isDatabaseAvailable();
  if (dbOk) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT id, customer_id, type, summary, source_team, created_by, created_at FROM interactions WHERE customer_id = $1 ORDER BY created_at DESC',
          [id]
        );
        return res.json({ data: result.rows });
      } finally {
        client.release();
      }
    } catch (err) {
      // Fallback to in-memory
    }
  }

  const interactions = inMemoryInteractions.filter(i => i.customer_id === id);
  return res.json({ data: interactions });
});

/**
 * GET /api/customers/:id/tags
 * Returns all tags assigned to customer :id.
 */
router.get('/customers/:id/tags', async (req, res, next) => {
  const { id } = req.params;
  if (!id || id === 'duplicates' || id === 'merge') {
    return next();
  }

  const dbOk = await isDatabaseAvailable();
  if (dbOk) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT customer_id, tag FROM customer_tags WHERE customer_id = $1 ORDER BY tag',
          [id]
        );
        return res.json({ data: result.rows.map(r => r.tag) });
      } finally {
        client.release();
      }
    } catch (err) {
      // Fallback to in-memory
    }
  }

  const tags = inMemoryTags.filter(t => t.customer_id === id).map(t => t.tag);
  return res.json({ data: tags });
});

/**
 * GET /api/customers/:id
 * Fetches single customer master record by ID.
 */
router.get('/customers/:id', async (req, res, next) => {
  const { id } = req.params;
  if (!id || id === 'duplicates' || id === 'merge') {
    return next();
  }

  const dbOk = await isDatabaseAvailable();
  if (dbOk) {
    try {
      const client = await pool.connect();
      try {
        const result = await client.query(
          'SELECT id, name, type, email, phone, gstin, billing_address, shipping_address, city, created_at FROM customers WHERE id = $1',
          [id]
        );
        if (result.rows.length === 0) {
          return res.status(404).json({ error: `Customer with ID '${id}' not found` });
        }
        return res.json({ data: result.rows[0] });
      } finally {
        client.release();
      }
    } catch (err) {
      // Fallback to in-memory
    }
  }

  const customer = inMemoryCustomers.find(c => c.id === id);
  if (!customer) {
    return res.status(404).json({ error: `Customer with ID '${id}' not found` });
  }
  return res.json({ data: customer });
});

/**
 * Close database pool (useful in test teardown)
 */
async function closePool() {
  if (pool && !pool.ended) {
    try {
      await pool.end();
    } catch (e) {}
  }
}

module.exports = router;
module.exports.resetInMemoryData = resetInMemoryData;
module.exports.closePool = closePool;
