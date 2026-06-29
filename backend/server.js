const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');

const authRoutes = require('./routes/authroutes');
const locationRoutes = require('./routes/locationrouter');
const notificationRoutes = require('./routes/notificationnsroutes');
const userRoutes = require('./routes/ueserroutes');
const weatherRoutes = require('./routes/whetherrouter');
const aiRoutes = require('./routes/ai.routes');

const app = express();
app.use(express.json());
app.use(cookieParser());

app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/locations', locationRoutes);
app.use('/api/v1/notifications', notificationRoutes);
app.use('/api/v1/user/preferences', userRoutes);
app.use('/api/v1/weather', weatherRoutes);
app.use('/api/v1/ai', aiRoutes);

const distPath = path.resolve(__dirname, '../dist');
if (require('fs').existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use((req, res, next) => {
    if (req.method === 'GET') {
      return res.sendFile(path.join(distPath, 'index.html'));
    }
    next();
  });
} else {
  app.get('/', (req, res) => {
    res.send('Backend is running. Build the frontend with npm run build to serve the static app.');
  });
}

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`Backend server listening on http://localhost:${PORT}`);
});
