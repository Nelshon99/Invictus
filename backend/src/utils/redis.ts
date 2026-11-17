// Redis is optional - falls back to no-op if not available
// Supports both host/port format (local) and URL format (Upstash, Render, etc.)
import Redis from 'ioredis';

let redis: Redis | null = null;
let redisAvailable = false;

export function getRedisClient(): Redis | null {
  if (redis !== null) {
    return redisAvailable ? redis : null;
  }
  try {
    // Support REDIS_URL format (Upstash, Render, etc.) or host/port format (local)
    const redisOptions: any = {
      lazyConnect: true,
      retryStrategy: (times: number) => {
        if (times > 3) {
          redisAvailable = false;
          return null;
        }
        return Math.min(times * 50, 2000);
      },
      maxRetriesPerRequest: 1,
    };

    // If REDIS_URL is provided (Upstash, Render, etc.), use it directly
    if (process.env.REDIS_URL) {
      redis = new Redis(process.env.REDIS_URL, redisOptions);
    } else {
      // Fallback to host/port format (local development)
      redis = new Redis({
        host: process.env.REDIS_HOST || 'localhost',
        port: parseInt(process.env.REDIS_PORT || '6379'),
        password: process.env.REDIS_PASSWORD || undefined,
        ...redisOptions,
      });
    }

    redis.on('error', (err) => {
      console.warn('Redis error:', err.message);
      redisAvailable = false;
    });

    redis.on('connect', () => {
      redisAvailable = true;
      console.log('Connected to Redis');
    });

    redis.on('close', () => {
      console.warn('Redis connection closed');
      redisAvailable = false;
    });

    // Give it a moment to connect
    setTimeout(() => {
      if (!redisAvailable) {
        console.warn('Redis not available - running without cache/logs in Redis');
      }
    }, 2000);

    return redis;
  } catch (error) {
    console.warn('Redis not available - running without cache/logs in Redis');
    redisAvailable = false;
    return null;
  }
}

export async function setCache(_key: string, _value: string, _ttlSeconds?: number): Promise<void> {
  const client = getRedisClient();
  if (!client || !redisAvailable) return;
  try {
    if (_ttlSeconds) {
      await client.set(_key, _value, 'EX', _ttlSeconds);
    } else {
      await client.set(_key, _value);
    }
  } catch (error) {
    console.error('Error setting cache:', error);
    redisAvailable = false;
  }
}

export async function getCache(_key: string): Promise<string | null> {
  const client = getRedisClient();
  if (!client || !redisAvailable) return null;
  try {
    return await client.get(_key);
  } catch (error) {
    console.error('Error getting cache:', error);
    redisAvailable = false;
    return null;
  }
}

export async function deleteCache(_key: string): Promise<void> {
  const client = getRedisClient();
  if (!client || !redisAvailable) return;
  try {
    await client.del(_key);
  } catch (error) {
    console.error('Error deleting cache:', error);
    redisAvailable = false;
  }
}
