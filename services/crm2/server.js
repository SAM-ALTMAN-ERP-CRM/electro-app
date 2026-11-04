const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

// Load root .env then local .env if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5102;

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    team: 'crm2',
    name: 'CRM-2 Support & Warranty',
    port: PORT
  });
});

// Auto-mount every router in routes/ at /api
const routesDir = path.join(__dirname, 'routes');
if (fs.existsSync(routesDir)) {
  fs.readdirSync(routesDir).forEach(file => {
    if (file.endsWith('.js')) {
      try {
        const router = require(path.join(routesDir, file));
        app.use('/api', router);
      } catch (err) {
        console.error('[crm2] Error mounting route file ' + file + ':', err.message);
      }
    }
  });
}

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Cannot ' + req.method + ' ' + req.originalUrl });
});

// Error handler
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

app.listen(PORT, () => {
  console.log('[crm2] Service "CRM-2 Support & Warranty" running on port ' + PORT);
});

module.exports = app;
