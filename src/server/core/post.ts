import { context, reddit } from '@devvit/web/server';
import { initializePost } from './game';

export const createPost = async () => {
  const title = `Two truths and one lie - ${new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })}`;

  const creatorUsername = (await reddit.getCurrentUsername()) ?? context.username ?? null;
  const post = await reddit.submitCustomPost({
    title,
  });

  await initializePost(post.id, {
    userId: context.userId ?? null,
    username: creatorUsername,
  });

  return {
    creatorUsername,
    post,
    subredditName: context.subredditName,
  };
};
