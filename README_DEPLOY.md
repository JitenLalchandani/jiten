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

### GitHub Actions deployment to Heroku
This repo includes a workflow at `.github/workflows/heroku-deploy.yml` that deploys on every push to `main`.

To enable it:
- Create a new Heroku app named `jiten` or another slug.
- Add GitHub repository secrets:
  - `HEROKU_API_KEY`
  - `HEROKU_APP_NAME`
  - `HEROKU_EMAIL`

Then push to `main` and the workflow will deploy automatically.

## Render deployment (no Heroku required)
Render is a good alternative if you want a straightforward deployment without Heroku.

1. Create a free Render account at `https://render.com`
2. Create a new Web Service
3. Connect your GitHub repo: `JitenLalchandani/jiten`
4. Set the branch to `main`
5. Use the build command:
   ```bash
   npm install && npm install --prefix backend && npm run build
   ```
6. Use the start command:
   ```bash
   npm start
   ```
7. Set environment to `Node`
8. Create the service

Render will deploy automatically on pushes to `main`.

## Vercel deployment
Vercel is best for hosting this project's Vite frontend. Keep the Express/SQLite backend on Render, Heroku, or another Node server, then point the Vercel frontend to that backend URL.

1. Push this project to GitHub.
2. Open `https://vercel.com/new` and import the GitHub repository.
3. Use the default Vite framework settings. This repo includes `vercel.json`, so Vercel will use:
   ```bash
   npm install --ignore-scripts
   npx vite build
   ```
4. Add this Environment Variable in Vercel:
   ```bash
   VITE_API_BASE_URL=https://your-backend-url.example.com
   ```
   Example for Render:
   ```bash
   VITE_API_BASE_URL=https://your-render-service.onrender.com
   ```
5. Deploy.

If you deploy only the frontend and do not set `VITE_API_BASE_URL`, the app will open but API features such as weather search, saved locations, and AI brief requests will not work in production.

## Notes
- The backend uses SQLite in `backend/data/skycast.sqlite`.
- If deploying on a platform that supports only one port, use the backend as the web process.
