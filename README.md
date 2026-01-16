# FFXIV Loot Tracker

A web application for tracking loot distribution from Final Fantasy XIV savage raids for your raid group.

## Features

- **Member Management**: Add, edit, and delete raid members
- **Best-in-Slot Import**: Import BiS lists from xivgear.app links
- **Loot Tracking**: Track which members have acquired which pieces from their BiS lists
- **Upgrade Materials**: Track augmented tome upgrade materials separately
- **Loot Distribution**: Floor-based loot distribution interface showing who needs what

## Architecture

- **Backend**: ASP.NET Core Web API (Clean Architecture)
- **Frontend**: React with TypeScript
- **Storage**: JSON file-based storage (no database required)

## Getting Started

### Prerequisites

- .NET 9.0 SDK
- Node.js 14+ (for frontend)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:
```bash
cd backend
```

2. Restore packages and build:
```bash
dotnet restore
dotnet build
```

3. Run the API:
```bash
cd FFXIVLoot.API
dotnet run
```

The API will be available at `http://localhost:5000` (or the port shown in the console).

### Frontend Setup

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

The frontend will be available at `http://localhost:3000`.

### Initial Data

The application automatically initializes with 8 default raid members on first startup:
- Elodie
- Illya
- Rami
- Renc
- Ryu
- Sasha
- Sandro
- Lob

## Usage

1. **Add Members**: Go to the Members page to add or edit raid members
2. **Import BiS**: Use the BiS Tracker page to import best-in-slot lists from xivgear links
3. **Track Progress**: Check off items as members acquire them
4. **Distribute Loot**: Use the Loot Distribution page to assign loot after completing floors

## Configuration

### Authentication

Simple password authentication can be enabled in `backend/FFXIVLoot.API/appsettings.json`:

```json
{
  "Authentication": {
    "Enabled": true,
    "PasswordHash": "your-sha256-hash-here"
  }
}
```

To generate a password hash, you can use any SHA256 hash generator. The password should be sent in the `X-Password` header or `password` query parameter.

### API URL

The frontend API URL can be configured via environment variable:
```bash
REACT_APP_API_URL=http://localhost:5000
```

## Data Storage

Member data is stored in `data/members.json` in the backend directory. This file is created automatically on first run.

## API Documentation

When running in development mode, Swagger UI is available at:
- `http://localhost:5000/swagger`

## Floor Loot Mapping

- **Floor 1**: Ears, Neck, Wrist, Right Ring, Left Ring
- **Floor 2**: Head, Hand, Feet + Accessory upgrade material
- **Floor 3**: Body, Legs + Armor upgrade material
- **Floor 4**: Weapon

## Deployment

This application is configured for deployment with:
- **Backend**: Render.com (ASP.NET Core Web API)
- **Frontend**: GitHub Pages (React static site)

### Backend Deployment (Render)

1. **Create Render Account**
   - Sign up at [render.com](https://render.com)
   - Connect your GitHub account

2. **Create Web Service**
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Configure the service:
     - **Name**: `ffxivloot-api` (or your preferred name)
     - **Environment**: `.NET`
     - **Root Directory**: `backend/FFXIVLoot.API`
     - **Build Command**: `dotnet publish -c Release -o ./publish`
     - **Start Command**: `dotnet ./publish/FFXIVLoot.API.dll`

3. **Configure Environment Variables**
   - `ASPNETCORE_ENVIRONMENT`: `Production`
   - `CORS_ORIGINS`: `https://YOUR_USERNAME.github.io,http://localhost:3000`
     - Replace `YOUR_USERNAME` with your GitHub username
   - `PORT`: (auto-provided by Render, no need to set)

4. **Enable Persistent Disk**
   - In Render dashboard, go to your service settings
   - Enable persistent disk (1GB is sufficient)
   - Mount path: `/opt/render/project/src/backend/FFXIVLoot.API/data`
   - This ensures your JSON data files persist across deployments

5. **Deploy**
   - Render will automatically deploy on push to main branch
   - Note your service URL (e.g., `https://ffxivloot-api.onrender.com`)

### Frontend Deployment (GitHub Pages)

1. **Update Configuration**
   - Edit `frontend/package.json` and update the `homepage` field:
     ```json
     "homepage": "https://YOUR_USERNAME.github.io/FFXIVLoot"
     ```
   - Replace `YOUR_USERNAME` with your GitHub username
   - Replace `FFXIVLoot` with your repository name if different

2. **Create Environment File**
   - Create `frontend/.env.production` (this file is gitignored):
     ```
     REACT_APP_API_URL=https://your-app.onrender.com
     ```
   - Replace with your actual Render backend URL

3. **Configure GitHub Secrets**
   - Go to your repository Settings → Secrets and variables → Actions
   - Add a new secret:
     - **Name**: `REACT_APP_API_URL`
     - **Value**: Your Render backend URL (e.g., `https://ffxivloot-api.onrender.com`)

4. **Enable GitHub Pages**
   - Go to repository Settings → Pages
   - Source: `gh-pages` branch
   - Root: `/` (root directory)

5. **Deploy**
   - Push to `main` branch
   - GitHub Actions will automatically build and deploy to `gh-pages`
   - Your app will be available at `https://YOUR_USERNAME.github.io/FFXIVLoot`

### Manual Frontend Deployment (Alternative)

If you prefer to deploy manually:

```bash
cd frontend
npm install
npm run build
npm run deploy
```

This will build the app and push it to the `gh-pages` branch.

### Post-Deployment Checklist

- [ ] Backend is accessible at Render URL
- [ ] Frontend is accessible at GitHub Pages URL
- [ ] CORS is configured correctly (check browser console for errors)
- [ ] API calls from frontend succeed
- [ ] Authentication works (if enabled)
- [ ] Data persists across deployments

### Troubleshooting

**CORS Errors**
- Ensure `CORS_ORIGINS` in Render includes your GitHub Pages URL
- Check that URLs match exactly (including `https://` and trailing slashes)

**Routing Issues**
- The app uses HashRouter in production for GitHub Pages compatibility
- Routes will be like `/#/members` instead of `/members`

**API Connection Issues**
- Verify `REACT_APP_API_URL` is set correctly in GitHub Secrets
- Check that the backend is running and accessible
- Verify CORS configuration allows your frontend domain

