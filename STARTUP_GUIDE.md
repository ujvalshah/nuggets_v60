# STARTUP GUIDE & ENVIRONMENT CONFIGURATION

## Environment Variables

### Frontend (.env in project root)

```bash
# Adapter Selection
# Options: 'local' (mock data) or 'rest' (real backend API)
# Default: 'local' if not set
VITE_ADAPTER_TYPE=local

# Example for using real backend:
# VITE_ADAPTER_TYPE=rest
```

**Note**: Vite requires the `VITE_` prefix for environment variables to be exposed to the frontend.

### Backend (server/.env)

```bash
# Server Port (optional, defaults to 5000)
PORT=5000

# MongoDB Connection (optional - server works without it)
# If not set, backend uses in-memory mock data
MONGODB_URI=mongodb://localhost:27017/nuggets

# Or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://user:pass@cluster.mongodb.net/nuggets

# Node Environment
NODE_ENV=development
```

## Startup Order

### Development Mode

1. **Start Backend** (Terminal 1):
   ```bash
   npm run dev:server
   ```
   - Server starts on port 5000
   - Works even if MongoDB is not available
   - Health check available at http://localhost:5000/api/health

2. **Start Frontend** (Terminal 2):
   ```bash
   npm run dev
   ```
   - Vite dev server starts on port 3000
   - Proxies `/api/*` requests to backend on port 5000
   - Frontend will attempt to connect to backend lazily (non-blocking)

### Alternative: Start Both Together

```bash
npm run dev:all
```

This uses `concurrently` to run both servers in one terminal.

## Adapter Modes

### Local Adapter (Mock Mode)
- **When**: `VITE_ADAPTER_TYPE=local` or not set
- **Data Source**: Browser localStorage
- **Backend Required**: No
- **Use Case**: Development, testing, demos

### Rest Adapter (Real Backend)
- **When**: `VITE_ADAPTER_TYPE=rest`
- **Data Source**: Backend API (port 5000)
- **Backend Required**: Yes
- **Use Case**: Production, integration testing

## Health Checks

### Backend Health Check
- **Endpoint**: `GET /api/health`
- **Response**: 
  ```json
  {
    "status": "ok",
    "timestamp": "2025-01-20T10:00:00.000Z",
    "mongodb": "connected" | "disconnected",
    "server": "running"
  }
  ```
- **Works**: Even if MongoDB is down

### Frontend Health Check
- **Location**: `src/main.tsx`
- **Behavior**: 
  - Runs lazily after 1 second delay
  - Retries up to 3 times with 2 second intervals
  - Non-blocking - app renders regardless of backend status
  - Logs warnings if backend unavailable (doesn't crash)

## Troubleshooting

### ECONNREFUSED Errors

**Symptom**: Console shows connection refused errors

**Causes**:
1. Backend not running
2. Backend on wrong port
3. Vite proxy misconfigured

**Solutions**:
1. Start backend: `npm run dev:server`
2. Check backend is on port 5000
3. Verify `vite.config.ts` proxy target is `http://127.0.0.1:5000`

### Backend Won't Start

**Symptom**: Backend crashes on startup

**Causes**:
1. MongoDB connection required (old behavior - now fixed)
2. Port 5000 already in use

**Solutions**:
1. Backend now starts even without MongoDB
2. Change PORT in server/.env or kill process on port 5000

### Frontend Shows Mock Data When Backend is Running

**Symptom**: Frontend uses LocalAdapter even with backend running

**Cause**: `VITE_ADAPTER_TYPE` not set to `rest`

**Solution**: Set `VITE_ADAPTER_TYPE=rest` in `.env` file

### MongoDB Connection Issues

**Symptom**: Backend warns about MongoDB connection

**Impact**: None - backend works with in-memory data

**Solution**: 
- Set `MONGODB_URI` in `server/.env` if you want to use MongoDB
- Or ignore the warning if using mock data

## Architecture Notes

### Current State
- **Backend**: Uses in-memory mock data (controllers have hardcoded arrays)
- **MongoDB**: Optional - connection attempted but not required
- **Frontend**: Supports both LocalAdapter (localStorage) and RestAdapter (API)

### Future Migration Path
When migrating to MongoDB:
1. Create Mongoose models in `server/src/models/`
2. Update controllers to use models instead of in-memory arrays
3. Backend will automatically use MongoDB when connected
4. Frontend RestAdapter normalization code (`_id` → `id`) is already in place

## Verification

After startup, verify:

1. ✅ Backend health check works: `curl http://localhost:5000/api/health`
2. ✅ Frontend loads without errors
3. ✅ No ECONNREFUSED spam in console
4. ✅ Data loads (mock or real depending on adapter)
5. ✅ Admin panel accessible
6. ✅ Masonry grid renders
