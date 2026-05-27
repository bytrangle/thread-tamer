import { Hono } from 'hono';
import { OnPostSubmitRequest, type OnAppInstallRequest, type TriggerResponse } from '@devvit/web/shared';
import { reddit } from '@devvit/reddit';
import { redis } from '@devvit/web/server';
import { indexPost } from '../utils/postIndex';
import { tokenizePostTitle } from '../utils/tokenizer';

export const triggers = new Hono();

const POST_EXPIRY_SECONDS = 90 * 24 * 60 * 60;
const SIMILARITY_THRESHOLD = 0.3;

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

triggers.post('/on-post-submit', async (c) => {
  const input = await c.req.json<OnPostSubmitRequest>();
  const post = input.post;
  if (!post?.title || !post?.id) {
    return c.json<TriggerResponse>({ status: 'ok' });
  }
  const newTokens = tokenizePostTitle(post.title);
  if (newTokens.length === 0) {
    return c.json<TriggerResponse>({ status: 'ok' });
  }
  const totalPosts = parseInt((await redis.get('posts:count')) ?? '0', 10);
  const cutoff = Date.now() - (POST_EXPIRY_SECONDS * 1000);

  // Compute IDF weight for each token in the new post
  const tokenIdfs = new Map<string, number>();
  for (const token of newTokens) {
    const df = await redis.zCard(`token:${token}`);
    tokenIdfs.set(token, Math.log((totalPosts + 1)/ (df + 1)));
  }

  // Accumulate weighted scores per candidate
  const sharedWeights = new Map<string, number>();
  const matchedTokens = new Set<string>();
  for (const token of newTokens) {
    const members = await redis.zRange(`token:${token}`, cutoff, Date.now(), { by: 'score' });
    const idf = tokenIdfs.get(token) ?? 0;
    for (const { member: postId } of members) {
      if (postId !== post.id) {
        sharedWeights.set(postId, (sharedWeights.get(postId) ?? 0) + idf);
        matchedTokens.add(token);
      }
    }
  }
  const matchedWeight = [...matchedTokens].reduce((sum, t) => sum + (tokenIdfs.get(t) ?? 0), 0);
  const similarPostIds = [...sharedWeights.entries()]
    .filter(([, weight]) => matchedWeight > 0 && weight / matchedWeight >= SIMILARITY_THRESHOLD)
    .sort(([, a], [, b]) => b - a)
    .map(([id]) => id);
  console.log('sharedWeights:', [...sharedWeights.entries()]);
  console.log('similarPostIds:', similarPostIds);
  if (similarPostIds.length > 0) {
    const similarPosts = (
      await Promise.all(similarPostIds.map(id => redis.hGetAll(`post:${id}`)))
    ).filter(Boolean);
    if (similarPosts.length > 0) {
      const lines = similarPosts.map(p => `- [${p.title}](${p.url})`).join('\n');
      const comment = await reddit.submitComment({
        id: post.id as `t3_${string}`,
        text: `Found ${similarPosts.length} possible similar posts submitted in the past 90 days:\n\n${lines}`,
        runAs: 'APP',
      });
      await comment.distinguish(true);
    }
  }

  // Index after similarity search so the new post doesn't match itself
  // and posts:count reflects the state at search time
  await indexPost(post.id, post.title, new Date(post.createdAt * 1000), post.permalink);
  return c.json<TriggerResponse>({ status: 'ok' });
})

