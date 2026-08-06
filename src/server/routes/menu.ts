import { Hono } from 'hono';
import { createPost } from '../core/post';

export const menu = new Hono();

menu.post('/post-create', async (c) => {
  try {
    const { post, subredditName } = await createPost();
    return c.json(
      {
        navigateTo: `https://reddit.com/r/${subredditName}/comments/${post.id}`,
        showToast: 'Post created. Open it to finish writing your truths and lie.',
      },
      200
    );
  } catch (error) {
    console.error('Error creating post:', error);
    return c.json(
      {
        showToast: 'Failed to create a game post.',
      },
      400
    );
  }
});
