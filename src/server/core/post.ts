import { context, reddit } from '@devvit/web/server';

export const createPost = async () => {
  const { subredditName } = context;
  if (!subredditName) {
    throw new Error('subredditName is required');
  }

  const username = await reddit.getCurrentUsername();

  return await reddit.submitCustomPost({
    splash: {
      // Splash Screen Configuration for Dhwani
      appDisplayName: 'Riff',
      backgroundUri: 'splash.png',
      buttonLabel: 'Start Jamming',
      description: 'Create musical riffs and collaborate with the Reddit community',
      heading: `Welcome to Riff${username ? `, u/${username}` : ''}!`,
      appIconUri: 'default-icon.png',
    },
    postData: {
      type: 'welcome',
      appVersion: '1.0.0',
      features: ['create', 'collaborate', 'challenge'],
      createdAt: Date.now(),
    },
    subredditName: subredditName,
    title: '🎵 Dhwani - Collaborative Music Creation',
    textFallback: {
      text: '🎵 Welcome to Dhwani! Create musical riffs and collaborate with the Reddit community. Click to start jamming!',
    },
  });
};
