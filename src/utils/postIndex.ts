import { redis } from '@devvit/redis';
import { tokenizePostTitle } from './tokenizer';

const POST_EXPIRY_SECONDS = 90 * 24 * 60 * 60;

export async function indexPost(
  postId: string,
  title: string,
  createdAt: Date,
  url: string,
): Promise<void> {
  await redis.hSet(`post:${postId}`, {
    title,
    createdTime: createdAt.getTime().toString(),
    url,
  });
  await redis.expire(`post:${postId}`, POST_EXPIRY_SECONDS);

  const tokens = tokenizePostTitle(title);
  for (const token of tokens) {
    await redis.zAdd(`token:${token}`, { score: createdAt.getTime(), member: postId });
    await redis.zAdd('token:registry', { score: 0, member: token });
  }
  await redis.incrBy('posts:count', 1);
}
