import { context, reddit } from '@devvit/web/server';
import { initializePost } from './game';

export const createPost = async () => {
  const title = `Two truths and one lie - ${new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`;

  const creatorUsername = await reddit.getCurrentUsername();
  const post = await reddit.submitCustomPost({
    title,
  });

  await initializePost(post.id, creatorUsername ?? null);

  return {
    creatorUsername,
    post,
    subredditName: context.subredditName,
  };
};
