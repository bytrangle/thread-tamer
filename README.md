Does your subreddit keep getting the same questions or content over and over again? **Thread Tamer** automatically detects similar past posts and includes them in a stickied comment. This heps users find existing discussions before diluting the thread.

## How It Works

When the app is installed, it will index all the posts from the subreddit within the last 90 days.

When someone submits a new post, the app will tokenize the post title and retrieve possible similar p>

If there is at least one match, the app will post a stickied comment that includes titles of the matched posts>

Example: "How to learn Python for beginners" would be considered a match for "Python tutorial for be>

## What It Can't Do

This app can only detect duplicates or near-duplicate post titles. It can't do semantic searching. Fo>

Also, it only performs matching on post titles only. Post bodies are not analyzed.

## Installation

1. Visit the dedicated page for this app on Reddit app listings [here](https://developers.reddit.com/r/thread_tamer_dev).

2. Click the button "Add to community"

3. Select the subreddit where you want this app to be installed

4. Click "Install"

The app will start indexing your subreddit's historic posts within 90 days. Once the indexing finishes, you will get a Modmail notification.

## Changelog

0.1.0 - 2026-06-04

- Index last 90 days of subreddit posts on install
- Tokenize new post titles and compute TF-IDF style similarity
- Post a stickied, distinguished comment listing similar past posts
