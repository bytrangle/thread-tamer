import { Hono } from 'hono';
import { redis } from '@devvit/redis';
import type { TaskResponse } from '@devvit/web/server';

export const scheduler = new Hono();

const POST_EXPIRY_MS = 90 * 24 * 60 * 60 * 1000;

scheduler.post('/daily-cleanup', async (c) => {
  console.log('Running daily cleanup of expired posts');
  const cutoff = Date.now() - POST_EXPIRY_MS;
  const tokens = await redis.zRange('token:registry', 0, -1);
  const expiredPostIds = new Set<string>();
  for (const { member: token } of tokens) {
    // Find expired members in this token's sorted set
    const expired = await redis.zRange(`token:${token}`, 0, cutoff, { by: 'score' });
    for (const { member: postId } of expired) {
      expiredPostIds.add(postId);
    }
    // Remove expired entries
    await redis.zRemRangeByScore(`token:${token}`, 0, cutoff);
    
    // Remove token from registry if no posts remain
    const remaining = await redis.zCard(`token:${token}`);
    if (remaining === 0) {
      await redis.zRem('token:registry', [token]);
    }
  }

  // Decrement posts:count by the number of expired posts
  if (expiredPostIds.size > 0) {
    await redis.incrBy('posts:count', -expiredPostIds.size);
  }
  return c.json<TaskResponse>({
    status: 'ok'
  }, 200);
})