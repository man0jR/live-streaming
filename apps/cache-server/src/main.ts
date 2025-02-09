import express from 'express';
import cors from 'cors';
import axios from 'axios';
import { createClient } from 'redis';

const app = express();
const port = process.env.PORT || 8081;

// Redis client for viewer count and rate limiting
const redis = createClient({
  url: process.env.REDIS_URL || 'redis://redis:6379'
});

redis.on('error', (err) => console.error('Redis Client Error', err));

// Connect to Redis
(async () => {
  await redis.connect();
})();

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', async (req, res) => {
  try {
    // Check media server connection
    await axios.get('http://media-server:8080/health');
    // Check Redis connection
    await redis.ping();
    res.json({ status: 'healthy' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Stream availability check with rate limiting
const RATE_LIMIT_WINDOW = 60; // 1 minute
const MAX_REQUESTS = 100;

app.get('/api/streams/:streamId', async (req, res) => {
  const { streamId } = req.params;
  const clientIp = req.ip;
  
  try {
    // Rate limiting using Redis
    const rateLimitKey = `ratelimit:${clientIp}:${Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW)}`;
    const requests = await redis.incr(rateLimitKey);
    
    // Set expiry for rate limit key if first request
    if (requests === 1) {
      await redis.expire(rateLimitKey, RATE_LIMIT_WINDOW);
    }
    
    if (requests > MAX_REQUESTS) {
      return res.status(429).json({ error: 'Too many requests' });
    }

    // Query media server
    const mediaServerUrl = `http://media-server:8080/live/${streamId}/index.m3u8`;
    const response = await axios.head(mediaServerUrl);
    
    if (response.status === 200) {
      // Increment viewer count
      await redis.incr(`viewers:${streamId}`);
      // Set expiry for viewer count (cleanup after stream ends)
      await redis.expire(`viewers:${streamId}`, 3600); // 1 hour TTL
      
      res.json({ available: true });
    } else {
      res.json({ available: false });
    }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 404) {
      return res.json({ available: false });
    }
    
    console.error('Error checking stream:', error);
    res.status(500).json({ error: 'Failed to check stream availability' });
  }
});

// Viewer count endpoint
app.get('/api/streams/:streamId/viewers', async (req, res) => {
  const { streamId } = req.params;
  try {
    const viewers = await redis.get(`viewers:${streamId}`);
    res.json({ viewers: parseInt(viewers || '0') });
  } catch (error) {
    console.error('Error getting viewer count:', error);
    res.status(500).json({ error: 'Failed to get viewer count' });
  }
});

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await redis.quit();
  process.exit(0);
});

app.listen(port, () => {
  console.log(`Cache server API running on port ${port}`);
});
