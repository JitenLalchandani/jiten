# Deployment Guide

## Prerequisites
- Node.js installed
- Git installed
- (Optional) Docker installed for container deployment

## Local deployment
1. Install dependencies
   ```bash
   npm install
   npm install --prefix backend
   ```
2. Build the frontend
   ```bash
   npm run build
   ```
3. Start the backend
   ```bash
   npm start
   ```
4. Open
   - Frontend: `http://localhost:5173`
   - Backend: `http://localhost:4000`

## Docker deployment
1. Build image
   ```bash
   docker build -t skycast .
   ```
2. Run container
   ```bash
   docker run -p 4000:4000 skycast
   ```
3. Open your app on `http://localhost:4000`

## Heroku deployment
1. Initialize Git
   ```bash
   git init
   git add .
   git commit -m "Initial deploy setup"
   ```
2. Create Heroku app
   ```bash
   heroku create
   ```
3. Deploy
   ```bash
   git push heroku main
   ```
4. Open
   ```bash
   heroku open
   ```

## Notes
- The backend uses SQLite in `backend/data/skycast.sqlite`.
- If deploying on a platform that supports only one port, use the backend as the web process.
