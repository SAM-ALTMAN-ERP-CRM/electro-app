const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { requireAuth } = require('../../_shared/auth');
const { makePool } = require('../../_shared/db');

const pool = makePool('erp2_db');

// All supplier endpoints require authentication
router.use(requireAuth);

// In-memory fallback stores loaded from mocks for offline / test environments
let inMemorySuppliers = [];
try {
  const mockSuppliersPath = path.resolve(__dirname, '../mocks/suppliers.json');
  if (fs.existsSync(mockSuppliersPath)) {
    inMemorySuppliers = JSON.parse(fs.readFileSync(mockSuppliersPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[erp2] Could not pre-load mock suppliers:', err.message);
}

let inMemoryRatings = [];
try {
  const mockRatingsPath = path.resolve(__dirname, '../mocks/ratings.json');
  if (fs.existsSync(mockRatingsPath)) {
    inMemoryRatings = JSON.parse(fs.readFileSync(mockRatingsPath, 'utf-8'));
  }
} catch (err) {
  console.warn('[erp2] Could not pre-load mock ratings:', err.message);
}

let mockSupplierIdCounter = inMemorySuppliers.length + 1;
let mockRatingIdCounter = inMemoryRatings.length + 1;

/**
 * Executes a PostgreSQL query safely; returns null if the database is offline.
 */
async function safeQuery(text, params) {
  try {
    return await pool.query(text, params);
  } catch (err) {
    return null;
  }
}

/**
 * GET /api/suppliers/top
 * Issue: [ERP2-A3]
 * Returns the top 3 best rated suppliers
 * NOTE: Must be mounted before /api/suppliers/:id to avoid parameter collision
 */
router.get('/suppliers/top', async (req, res) => {
  try {
    const queryText = `
      SELECT id, name, contact_person, phone, email, city, gstin, payment_terms, rating, active, created_at
      FROM suppliers
      ORDER BY rating DESC, id ASC
      LIMIT 3
    `;

    const dbRes = await safeQuery(queryText);
    if (dbRes && dbRes.rows) {
      return res.json({ data: dbRes.rows });
    }

    // Fallback in-memory sorting
    const topThree = [...inMemorySuppliers]
      .sort((a, b) => (Number(b.rating) || 0) - (Number(a.rating) || 0))
      .slice(0, 3);

    return res.json({ data: topThree });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * GET /api/suppliers
 * Query params:
 *   - q: search term matching name, contact_person, email, gstin, or id (case-insensitive)
 *   - city: filter by city (case-insensitive)
 *   - active: filter by true/false
 */
router.get('/suppliers', async (req, res) => {
  try {
    const { q, city, active } = req.query;

    let queryText = `
      SELECT id, name, contact_person, phone, email, city, gstin, payment_terms, rating, active, created_at
      FROM suppliers
    `;
    const conditions = [];
    const params = [];

    if (city) {
      params.push(String(city).trim().toLowerCase());
      conditions.push(`LOWER(city) = $${params.length}`);
    }

    if (active !== undefined) {
      const isActive = String(active).toLowerCase() === 'true';
      params.push(isActive);
      conditions.push(`active = $${params.length}`);
    }

    if (q) {
      const searchTerm = `%${String(q).trim().toLowerCase()}%`;
      params.push(searchTerm);
      const idx = params.length;
      conditions.push(`(
        LOWER(name) LIKE $${idx} OR
        LOWER(COALESCE(contact_person, '')) LIKE $${idx} OR
        LOWER(COALESCE(email, '')) LIKE $${idx} OR
        LOWER(COALESCE(gstin, '')) LIKE $${idx} OR
        LOWER(id) LIKE $${idx}
      )`);
    }

    if (conditions.length > 0) {
      queryText += ' WHERE ' + conditions.join(' AND ');
    }
    queryText += ' ORDER BY id ASC';

    const dbRes = await safeQuery(queryText, params);
    if (dbRes && dbRes.rows) {
      return res.json({ data: dbRes.rows });
    }

    // Fallback in-memory filter
    let filtered = [...inMemorySuppliers];

    if (city) {
      const c = String(city).trim().toLowerCase();
      filtered = filtered.filter(s => s.city && s.city.toLowerCase() === c);
    }

    if (active !== undefined) {
      const isActive = String(active).toLowerCase() === 'true';
      filtered = filtered.filter(s => Boolean(s.active) === isActive);
    }

    if (q) {
      const term = String(q).trim().toLowerCase();
      filtered = filtered.filter(s =>
        (s.name && s.name.toLowerCase().includes(term)) ||
        (s.contact_person && s.contact_person.toLowerCase().includes(term)) ||
        (s.email && s.email.toLowerCase().includes(term)) ||
        (s.gstin && s.gstin.toLowerCase().includes(term)) ||
        (s.id && s.id.toLowerCase().includes(term))
      );
    }

    return res.json({ data: filtered });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * GET /api/suppliers/:id
 * Retrieve a specific supplier by ID (e.g. SUP-0001)
 */
router.get('/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const dbRes = await safeQuery('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (dbRes && dbRes.rows) {
      if (dbRes.rows.length === 0) {
        return res.status(404).json({ error: `Supplier with ID '${id}' not found` });
      }
      return res.json({ data: dbRes.rows[0] });
    }

    // In-memory fallback
    const found = inMemorySuppliers.find(s => s.id === id);
    if (!found) {
      return res.status(404).json({ error: `Supplier with ID '${id}' not found` });
    }
    return res.json({ data: found });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * GET /api/suppliers/:id/ratings
 * Issue: [ERP2-A3]
 * List ratings for a specific supplier
 */
router.get('/suppliers/:id/ratings', async (req, res) => {
  try {
    const { id } = req.params;

    const dbRes = await safeQuery(
      'SELECT * FROM supplier_ratings WHERE supplier_id = $1 ORDER BY created_at DESC',
      [id]
    );
    if (dbRes && dbRes.rows) {
      return res.json({ data: dbRes.rows });
    }

    // Fallback in-memory
    const filtered = inMemoryRatings
      .filter(r => r.supplier_id === id)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

    return res.json({ data: filtered });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/suppliers/:id/ratings
 * Issue: [ERP2-A3]
 * Stores a supplier rating and recalculates suppliers.rating as the average of all scores
 * Body: { delivery_score, quality_score, comment }
 */
router.post('/suppliers/:id/ratings', async (req, res) => {
  try {
    const { id } = req.params;
    const { delivery_score, quality_score, comment = '' } = req.body || {};

    // 1. Validation
    const delivery = Number(delivery_score);
    const quality = Number(quality_score);

    if (isNaN(delivery) || delivery < 1 || delivery > 5) {
      return res.status(400).json({
        error: 'Validation error: delivery_score must be a numeric score between 1 and 5'
      });
    }

    if (isNaN(quality) || quality < 1 || quality > 5) {
      return res.status(400).json({
        error: 'Validation error: quality_score must be a numeric score between 1 and 5'
      });
    }

    // 2. Check supplier exists
    const checkSup = await safeQuery('SELECT * FROM suppliers WHERE id = $1', [id]);
    const mockSup = inMemorySuppliers.find(s => s.id === id);

    if (checkSup && checkSup.rows && checkSup.rows.length === 0) {
      return res.status(404).json({ error: `Supplier with ID '${id}' not found` });
    }
    if (!checkSup && !mockSup) {
      return res.status(404).json({ error: `Supplier with ID '${id}' not found` });
    }

    // 3. Generate Rating ID
    const seqRes = await safeQuery("SELECT nextval('supplier_ratings_seq') AS n");
    let ratingId;
    if (seqRes && seqRes.rows && seqRes.rows[0]) {
      ratingId = 'RAT-' + String(seqRes.rows[0].n).padStart(4, '0');
    } else {
      ratingId = 'RAT-' + String(mockRatingIdCounter++).padStart(4, '0');
    }

    // 4. Insert into supplier_ratings
    const insertQuery = `
      INSERT INTO supplier_ratings (id, supplier_id, delivery_score, quality_score, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    const insertRes = await safeQuery(insertQuery, [
      ratingId,
      id,
      delivery,
      quality,
      comment ? String(comment).trim() : null
    ]);

    // In-memory store update
    const newRatingRecord = {
      id: ratingId,
      supplier_id: id,
      delivery_score: delivery,
      quality_score: quality,
      comment: comment ? String(comment).trim() : null,
      created_at: new Date().toISOString()
    };
    inMemoryRatings.push(newRatingRecord);

    // 5. Recalculate average rating of all scores for this supplier
    let updatedAverage = 0;
    let updatedSupplier = null;

    if (insertRes && insertRes.rows && insertRes.rows[0]) {
      const avgQuery = `
        SELECT ROUND(AVG((delivery_score + quality_score) / 2.0), 2) AS avg_score
        FROM supplier_ratings
        WHERE supplier_id = $1
      `;
      const avgRes = await safeQuery(avgQuery, [id]);
      if (avgRes && avgRes.rows && avgRes.rows[0]) {
        updatedAverage = Number(avgRes.rows[0].avg_score);
      }

      const updateSupRes = await safeQuery(
        'UPDATE suppliers SET rating = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
        [updatedAverage, id]
      );
      if (updateSupRes && updateSupRes.rows && updateSupRes.rows[0]) {
        updatedSupplier = updateSupRes.rows[0];
      }
    }

    // Fallback recalculation
    const supRatings = inMemoryRatings.filter(r => r.supplier_id === id);
    const sumScores = supRatings.reduce((acc, r) => acc + (Number(r.delivery_score) + Number(r.quality_score)) / 2.0, 0);
    const inMemAvg = Math.round((sumScores / supRatings.length) * 100) / 100;

    if (mockSup) {
      mockSup.rating = inMemAvg;
      if (!updatedSupplier) {
        updatedSupplier = mockSup;
      }
    }
    if (!updatedAverage) {
      updatedAverage = inMemAvg;
    }

    return res.status(201).json({
      data: {
        ...(insertRes && insertRes.rows && insertRes.rows[0] ? insertRes.rows[0] : newRatingRecord),
        new_average_rating: updatedAverage,
        supplier: updatedSupplier
      }
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * POST /api/suppliers
 * Create a new supplier
 * Body: { name, contact_person, phone, email, city, gstin, payment_terms }
 */
router.post('/suppliers', async (req, res) => {
  try {
    const {
      name,
      contact_person,
      phone,
      email,
      city,
      gstin,
      payment_terms = 'net30',
      rating = 0,
      active = true
    } = req.body || {};

    // 1. Validation
    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'Validation error: name is required' });
    }

    const validTerms = ['advance', 'net15', 'net30'];
    const terms = String(payment_terms).trim().toLowerCase();
    if (!validTerms.includes(terms)) {
      return res.status(400).json({
        error: `Validation error: payment_terms must be one of [${validTerms.join(', ')}]`
      });
    }

    if (gstin && String(gstin).trim().length !== 15) {
      return res.status(400).json({
        error: 'Validation error: GSTIN must be exactly 15 characters'
      });
    }

    const cleanGstin = gstin ? String(gstin).trim().toUpperCase() : null;
    const cleanRating = Number(rating) >= 0 && Number(rating) <= 5 ? Number(rating) : 0;
    const cleanActive = active !== false;

    // 2. Generate next ID & Insert into Database
    const seqRes = await safeQuery("SELECT nextval('suppliers_seq') AS n");
    let newId;
    if (seqRes && seqRes.rows && seqRes.rows[0]) {
      newId = 'SUP-' + String(seqRes.rows[0].n).padStart(4, '0');
    } else {
      newId = 'SUP-' + String(mockSupplierIdCounter++).padStart(4, '0');
    }

    const insertText = `
      INSERT INTO suppliers (id, name, contact_person, phone, email, city, gstin, payment_terms, rating, active)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    const insertParams = [
      newId,
      name.trim(),
      contact_person ? contact_person.trim() : null,
      phone ? phone.trim() : null,
      email ? email.trim() : null,
      city ? city.trim() : null,
      cleanGstin,
      terms,
      cleanRating,
      cleanActive
    ];

    const dbRes = await safeQuery(insertText, insertParams);
    if (dbRes && dbRes.rows && dbRes.rows[0]) {
      return res.status(201).json({ data: dbRes.rows[0] });
    }

    // In-memory fallback
    const newRecord = {
      id: newId,
      name: name.trim(),
      contact_person: contact_person ? contact_person.trim() : null,
      phone: phone ? phone.trim() : null,
      email: email ? email.trim() : null,
      city: city ? city.trim() : null,
      gstin: cleanGstin,
      payment_terms: terms,
      rating: cleanRating,
      active: cleanActive,
      created_at: new Date().toISOString()
    };
    inMemorySuppliers.push(newRecord);
    return res.status(201).json({ data: newRecord });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * PATCH /api/suppliers/:id
 * Partial update for an existing supplier
 */
router.patch('/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const body = req.body || {};

    if (body.payment_terms) {
      const validTerms = ['advance', 'net15', 'net30'];
      if (!validTerms.includes(String(body.payment_terms).toLowerCase())) {
        return res.status(400).json({
          error: `Validation error: payment_terms must be one of [${validTerms.join(', ')}]`
        });
      }
    }

    if (body.gstin && String(body.gstin).trim().length !== 15) {
      return res.status(400).json({
        error: 'Validation error: GSTIN must be exactly 15 characters'
      });
    }

    // Check if supplier exists in DB
    const checkDb = await safeQuery('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (checkDb && checkDb.rows) {
      if (checkDb.rows.length === 0) {
        return res.status(404).json({ error: `Supplier with ID '${id}' not found` });
      }

      const existing = checkDb.rows[0];
      const updateFields = [];
      const updateValues = [];

      const allowedFields = ['name', 'contact_person', 'phone', 'email', 'city', 'gstin', 'payment_terms', 'rating', 'active'];
      for (const field of allowedFields) {
        if (body[field] !== undefined) {
          updateValues.push(body[field]);
          updateFields.push(`${field} = $${updateValues.length}`);
        }
      }

      if (updateFields.length === 0) {
        return res.json({ data: existing });
      }

      updateValues.push(id);
      const updateQuery = `
        UPDATE suppliers
        SET ${updateFields.join(', ')}, updated_at = CURRENT_TIMESTAMP
        WHERE id = $${updateValues.length}
        RETURNING *
      `;
      const updateRes = await safeQuery(updateQuery, updateValues);
      if (updateRes && updateRes.rows && updateRes.rows[0]) {
        return res.json({ data: updateRes.rows[0] });
      }
    }

    // In-memory fallback
    const idx = inMemorySuppliers.findIndex(s => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: `Supplier with ID '${id}' not found` });
    }

    const updated = {
      ...inMemorySuppliers[idx],
      ...body,
      id // preserve primary key
    };
    inMemorySuppliers[idx] = updated;
    return res.json({ data: updated });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

/**
 * DELETE /api/suppliers/:id
 * Deactivates or removes a supplier
 */
router.delete('/suppliers/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const checkDb = await safeQuery('SELECT * FROM suppliers WHERE id = $1', [id]);
    if (checkDb && checkDb.rows) {
      if (checkDb.rows.length === 0) {
        return res.status(404).json({ error: `Supplier with ID '${id}' not found` });
      }
      await safeQuery('UPDATE suppliers SET active = false WHERE id = $1', [id]);
      return res.json({ data: { message: 'Supplier deactivated successfully', id } });
    }

    // In-memory fallback
    const idx = inMemorySuppliers.findIndex(s => s.id === id);
    if (idx === -1) {
      return res.status(404).json({ error: `Supplier with ID '${id}' not found` });
    }
    inMemorySuppliers[idx].active = false;
    return res.json({ data: { message: 'Supplier deactivated successfully', id } });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

module.exports = router;
