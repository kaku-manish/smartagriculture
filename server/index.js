require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));
app.use(bodyParser.urlencoded({ limit: '50mb', extended: true }));
const path = require('path');
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
const iotRoutes = require('./routes/iot');
const droneRoutes = require('./routes/drone');
const farmRoutes = require('./routes/farm');

app.use('/iot', iotRoutes);
app.use('/drone', droneRoutes);
app.use('/farm', farmRoutes);
app.use('/auth', require('./routes/auth'));
app.use('/admin', require('./routes/admin'));
app.use('/cost', require('./routes/cost'));
app.use('/reports', require('./routes/reports'));
app.use('/orders', require('./routes/orders'));

// Basic Health Check
app.get('/', (req, res) => {
  res.send({ message: 'Paddy Disease Detection Backend is running.' });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
