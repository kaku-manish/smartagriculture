require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Debug Middleware
app.use((req, res, next) => {
  console.log(`📡 [${req.method}] ${req.originalUrl}`);
  next();
});

// Import Routes
const reportsRoutes = require('./routes/reports');

// Register Routes
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/iot', require('./routes/iot'));
app.use('/drone', require('./routes/drone'));
app.use('/farm', require('./routes/farm'));
app.use('/cost', require('./routes/cost'));
app.use('/reports', reportsRoutes); // <--- Reports Engine
app.use('/orders', require('./routes/orders'));
app.use('/precision', require('./routes/precision'));
app.use('/heatmap', require('./routes/heatmap'));
app.use('/predict', require('./routes/prediction'));
app.use('/biz', require('./routes/business'));
app.use('/ops', require('./routes/operators')); // <--- Drone Operator Network

// Health Check
app.get('/', (req, res) => {
  res.send({ status: 'OK', message: 'Agro Backend is running.' });
});

// Initialize Cron
try {
  const cronService = require('./services/cron_service');
  cronService.init();
} catch (e) {
  console.error("Cron Service failed to start:", e.message);
}

// 404 Catch-all (Must be last)
app.use((req, res) => {
  console.log(`🚫 404: ${req.method} ${req.originalUrl}`);
  res.status(404).json({ error: `Route ${req.method} ${req.originalUrl} not found` });
});

app.listen(PORT, () => {
  console.log(`🚀 Server listening on http://localhost:${PORT}`);
});
