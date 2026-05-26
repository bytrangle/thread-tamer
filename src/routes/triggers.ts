import { Hono } from 'hono';
import type { OnAppInstallRequest, TriggerResponse } from '@devvit/web/shared';
import { reddit } from '@devvit/reddit';
import { redis } from '@devvit/web/server';
import { indexPost } from '../utils/postIndex';

export const triggers = new Hono();

const POST_EXPIRY_SECONDS = 90 * 24 * 60 * 60;

triggers.post('/on-app-install', async (c) => {
  const input = await c.req.json<OnAppInstallRequest>();
  const subredditName = input.subreddit?.name;
  console.log('👌 App installed to subreddit: r/' + subredditName);
  const subredditId = input.subreddit?.id;
  try {
    if (!subredditName) {
      throw new Error('Subreddit name is missing from installation request');
    }
    const cutoff = Date.now() - POST_EXPIRY_SECONDS * 1000;
    const listing = reddit.getNewPosts({ subredditName, pageSize: 100 });
    for await (const post of listing) {
      if (post.createdAt.getTime() < cutoff) break;
      const existing = await redis.hGet(`post:${post.id}`, 'title');
      if (!existing) {
        await indexPost(post.id, post.title, post.createdAt, post.permalink);
      }
    }
    console.log(`Indexed posts for subreddit: r/${subredditName}`);
    if (subredditId) {
      await reddit.modMail.createModNotification({
        subject: 'Thread Tamer is ready',
        bodyMarkdown: `**Indexing complete!** \n\n Thread Tamer has finished indexing recent posts in r/${subredditName}. From now on, it will actively detect duplicate posts on new posts submitted`,
        subredditId: (subredditId.startsWith('t5_') ? subredditId : `t5_${subredditId}`) as `t5_${string}`
      })
    }
  } catch (error) {
    console.error('Error during app installation indexing: ', error);
  }
  return c.json<TriggerResponse>(
    {
      status: 'success',
    },
    200
  );
});
