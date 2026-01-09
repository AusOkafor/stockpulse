# Redis Setup (Optional for Development)

Redis is used for background job processing with BullMQ. In **development mode**, Redis is optional - the app will start without it, but background jobs won't process.

## Option 1: Skip Redis in Development (Current Setup)

The app is configured to start without Redis in development mode. You'll see connection errors, but the app will continue to work. Background jobs simply won't process.

## Option 2: Install and Run Redis Locally

### Windows

1. **Download Redis for Windows**:
   - Option A: Use WSL2 (Windows Subsystem for Linux) and install Redis there
   - Option B: Download from: https://github.com/microsoftarchive/redis/releases
   - Option C: Use Docker: `docker compose up -d redis`

2. **Start Redis**:
   ```powershell
   # If using Docker
   docker compose up -d redis
   
   # Or if installed locally
   redis-server
   ```

### macOS

```bash
brew install redis
brew services start redis
```

### Linux

```bash
sudo apt-get install redis-server
sudo systemctl start redis
```

## Option 3: Use Cloud Redis

Use a managed Redis service like:
- Upstash (free tier available)
- Redis Cloud
- AWS ElastiCache

Then set `REDIS_URL` in your `.env` file.

## Configuration

Add to `backend/.env`:

```env
# Optional - only needed if you want background jobs to work
REDIS_URL=redis://localhost:6379

# Or use individual variables
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
```

## Current Behavior

- **Development**: App starts even if Redis is unavailable (you'll see connection errors, but app continues)
- **Production**: Redis connection is required for background jobs to work

## Disable Redis Completely

To disable Redis entirely in development, you can comment out `JobsModule` in `app.module.ts`, but this is not recommended as it's part of the core architecture.

