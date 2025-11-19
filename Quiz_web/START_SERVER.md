# How to Start the Server

## Quick Start

1. **Start the Backend Server:**
   ```bash
   cd backend
   npm start
   ```

2. **In a new terminal, start the Frontend:**
   ```bash
   npm run dev
   ```

## Troubleshooting "Connection Refused" Error

### Check if Backend is Running

1. Open your browser and go to: `http://localhost:3001`
   - You should see: `{"status":"ok","message":"QuizWeb Backend API"}`
   - If you see this, the backend is running correctly!

2. Check the backend console for:
   - ✅ Database connection successful!
   - ✅ Server listening on http://localhost:3001

### Common Issues

**Issue 1: Port 3001 is already in use**
- Solution: Kill the process using port 3001 or change the port in `backend/index.js`

**Issue 2: Database connection fails**
- The server will still start in development mode
- Check your database credentials in `backend/db.js`
- Make sure your Aiven database is accessible

**Issue 3: Frontend can't connect**
- Make sure backend is running on port 3001
- Check that `vite.config.ts` has the correct proxy target: `http://localhost:3001`

## Verify Everything is Working

1. Backend health check: `http://localhost:3001/`
2. Frontend: `http://localhost:5173`
3. API test: `http://localhost:5173/api` (should proxy to backend)

## Database Connection

The app is configured to use Aiven MySQL:
- Host: mysql-374b4d8f-priyanshgolwalkar25-646d.d.aivencloud.com
- Port: 18058
- Database: defaultdb
- User: avnadmin
- SSL mode: REQUIRED (uses Aiven-provided certificate)

If you see database connection errors, check:
- Internet connection
- Aiven service is active
- Firewall allows outbound connections

