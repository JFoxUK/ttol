import {Devvit} from '@devvit/public-api'

// Enable Redis and Reddit API
Devvit.configure({
  redis: true,
  redditAPI: true,
  realtime: true
});

interface TwoTruthsAndALieProps {
  truth1: string;
  truth2: string;
  lie: string;
}

interface PostData extends TwoTruthsAndALieProps {
  votes: number[];
}

const Header = () => (
  <vstack>
    <hstack height='32px' alignment='middle'>
      <spacer size='medium' />
      <text size='small' weight='bold' color='neutral-content'>
        Two Truths and a Lie
      </text>
    </hstack>
    <hstack height='1px' />
  </vstack>
)

const Footer = (props: {children?: Devvit.ElementChildren}) => (
  <vstack>
    <hstack gap='small' alignment='middle' padding='medium' height='32px'>
      {props.children ?? null}
      <text color='neutral-content-weak' size='small'>
        Guess the lie!
      </text>
    </hstack>
    <spacer size='small' />
  </vstack>
)

Devvit.addCustomPostType({
  name: 'Two Truths and a Lie',
  height: 'regular',
  render: (context) => {
    const postId = context.postId || '';

    // Get post data from Redis
    const [postData] = context.useState(async () => {
      return await context.redis.hGetAll(`post:${postId}`);
    });

    // Get votes from Redis
    const [votesData] = context.useState(async () => {
      const data = await context.redis.hGetAll(`post:${postId}:votes`);
      return data?.votes ? JSON.parse(data.votes) : [0, 0, 0];
    });

    // Get reveal state from Redis
    const [isRevealed] = context.useState(async () => {
      const data = await context.redis.hGet(`post:${postId}:reveal`, 'revealed');
      return data === 'true';
    });

    // Check if current user is the OP
    const [isOP] = context.useState(async () => {
      try {
        if (!context.userId) {
          console.log('No userId found');
          return false;
        }
        // Check against stored creator ID instead of post author
        const creatorId = await context.redis.hGet(`post:${postId}`, 'creatorId');
        console.log('Creator check:', {
          userId: context.userId,
          creatorId,
          isMatch: context.userId === creatorId
        });
        return context.userId === creatorId;
      } catch (error) {
        console.error('Error checking if user is creator:', error);
        return false;
      }
    });

    // Check if user has already voted
    const [hasVoted, setHasVoted] = context.useState(async () => {
      if (!context.userId) return false;
      const voters = await context.redis.hGet(`post:${postId}:voters`, 'users') || '[]';
      return JSON.parse(voters).includes(context.userId);
    });
    
    if (!postData?.truth1 || !postData?.truth2 || !postData?.lie) {
      return (
        <vstack padding="medium">
          <text>Loading Two Truths and a Lie...</text>
        </vstack>
      );
    }

    const { truth1, truth2, lie } = postData;
    const currentVotes = votesData || [0, 0, 0];

    const [shuffled, setShuffled] = context.useState<Array<{ text: string; index: number }>>(() => {
      const statements = [truth1, truth2, lie].map((text, index) => ({ text, index }));
      for (let i = statements.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [statements[i], statements[j]] = [statements[j], statements[i]];
      }
      return statements;
    });

    const [votes, setVotes] = context.useState(currentVotes);
    const [selection, setSelection] = context.useState<number | null>(null);
    const [reveal, setReveal] = context.useState(isRevealed);

    const totalVotes = votes.reduce((acc: number, val: number) => acc + val, 0);

    const VotingScreen = (
      <vstack padding='medium' alignment='start' gap='medium' grow>
        {shuffled.map((item: { text: string }, index: number) => (
          <hstack
            alignment='middle'
            height='32px'
            padding='small'
            onPress={() => setSelection(index)}
          >
            <icon
              name={
                selection === index ? 'radio-button-fill' : 'radio-button-outline'
              }
            />
            <spacer size='small' />
            <text>{item.text}</text>
          </hstack>
        ))}
      </vstack>
    );

    const ResultsScreen = (
      <vstack alignment='start' gap='small' padding='medium' grow>
        {shuffled.map((item: { text: string; index: number }, displayIndex: number) => {
          const percentage = totalVotes ? Math.round((votes[item.index] / totalVotes) * 100) : 0;
          const isLie = item.text === lie;
          return (
            <vstack width='100%' gap='small'>
              <hstack gap='medium' alignment='middle'>
                <text weight='bold'>{votes[item.index]}</text>
                <text>{item.text}</text>
                {isLie && (isRevealed || reveal) && (
                  <text color='red' weight='bold'> (Lie!)</text>
                )}
              </hstack>
              <hstack
                height='8px'
                width={`${percentage}%`}
                borderColor={isLie && (reveal || isRevealed) ? 'red' : 'secondary'}
                backgroundColor={isLie && (reveal || isRevealed) ? 'red' : 'green'}
                cornerRadius='small'
              />
            </vstack>
          );
        })}
      </vstack>
    );

    const handleVote = async () => {
      if (selection !== null && context.userId) {
        // Add user to voters list
        const voters = await context.redis.hGet(`post:${postId}:voters`, 'users') || '[]';
        const votersList = JSON.parse(voters);
        votersList.push(context.userId);
        await context.redis.hSet(`post:${postId}:voters`, {
          users: JSON.stringify(votersList)
        });

        const newVotes = [...votes];
        newVotes[selection] += 1;
        setVotes(newVotes);
        setHasVoted(true);

        // Store votes in Redis
        await context.redis.hSet(`post:${postId}:votes`, {
          votes: JSON.stringify(newVotes)
        });
      }
    };

    const handleReveal = async () => {
      await context.redis.hSet(`post:${postId}:reveal`, {
        revealed: 'true'
      });
      setReveal(true);
    };

    return (
      <vstack height='100%'>
        <Header />
        {(hasVoted || isOP) ? ResultsScreen : VotingScreen}
        <Footer>
          {!hasVoted && !isOP && (
            <button
              appearance='primary'
              size='small'
              disabled={selection === null}
              onPress={handleVote}
            >
              Submit Guess
            </button>
          )}
          {(hasVoted || isOP) && isOP && !isRevealed && (
            <button
              appearance='secondary'
              size='small'
              onPress={handleReveal}
            >
              Reveal the Lie
            </button>
          )}
        </Footer>
      </vstack>
    );
  },
});

// Create a form for entering truths and lie
const createTwoTruthsForm = Devvit.createForm(
  {
    title: 'Create Two Truths and a Lie',
    fields: [
      { name: 'truth1', label: 'First Truth', type: 'string', required: true },
      { name: 'truth2', label: 'Second Truth', type: 'string', required: true },
      { name: 'lie', label: 'The Lie', type: 'string', required: true }
    ],
    acceptLabel: 'Create Post'
  },
  async (event, context) => {
    const { truth1 = '', truth2 = '', lie = '' } = event.values;
    
    if (!truth1 || !truth2 || !lie) {
      context.ui.showToast('Please fill in all fields');
      return;
    }

    const currentSubreddit = await context.reddit.getCurrentSubreddit();
    
    try {
      // Create the post with our custom post type
      const post = await context.reddit.submitPost({
        title: 'Two Truths and a Lie',
        subredditName: currentSubreddit.name,
        preview: (
          <vstack padding="medium">
            <text>Loading Two Truths and a Lie...</text>
          </vstack>
        )
      });

      if (!post || !post.id) {
        context.ui.showToast('Failed to create post');
        return;
      }

      // Store the data in Redis
      await context.redis.hSet(`post:${post.id}`, {
        truth1,
        truth2,
        lie,
        creatorId: context.userId || ''
      });

      context.ui.showToast('Created Two Truths and a Lie post!');
      
      // Navigate to the newly created post
      context.ui.navigateTo(post);
    } catch (error) {
      console.error('Error creating post:', error);
      context.ui.showToast('Error creating post');
    }
  }
);

// Add menu item to create new posts
Devvit.addMenuItem({
  location: 'subreddit',
  label: 'Create Two Truths and a Lie',
  onPress: async (_, context) => {
    try {
      await context.ui.showForm(createTwoTruthsForm);
    } catch (error) {
      console.error('Error creating post:', error);
      context.ui.showToast('Error creating post');
    }
  }
});

export default Devvit
