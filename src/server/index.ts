import express from 'express';
import {
  InitResponse,
  IncrementResponse,
  DecrementResponse,
  CreateRiffRequest,
  CreateRiffResponse,
  CreateJamReplyRequest,
  CreateJamReplyResponse,
  GetCompositionResponse,
  GetThreadCompositionResponse,
  SubmitChallengeScoreRequest,
  SubmitChallengeScoreResponse,
  GetLeaderboardRequest,
  GetLeaderboardResponse,
  GetChallengeScoresRequest,
  GetChallengeScoresResponse,
  CreateChallengeRequest,
  CreateChallengeResponse,
  ApiErrorResponse,
} from '../shared/types/api.js';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post.js';
import type { TrackData, CompositionData } from '../shared/types/music.js';
import {
  generateRiffTitle,
  generateRiffPreview,
  generateJamReplyText,
  generateCompositionMetadata,
} from './utils/postUtils.js';
import {
  storeComposition,
  getComposition,
  storeJamReply,
  getJamReply,
  storeChallengeScore,
  getChallengeScores,
  getLeaderboard,
} from './utils/redisUtils.js';

const app = express();

// Middleware for JSON body parsing
app.use(express.json({ limit: '10mb' })); // Increased limit for musical data
// Middleware for URL-encoded body parsing
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
// Middleware for plain text body parsing
app.use(express.text({ limit: '10mb' }));

const router = express.Router();

router.post<{ postId: string }, InitResponse | { status: string; message: string }>(
  '/api/init',
  async (_req, res): Promise<void> => {
    const { postId } = context;

    // In development mode, allow initialization without postId
    const isDevelopment = !postId || postId === 'dev' || process.env.NODE_ENV === 'development';

    if (!isDevelopment && !postId) {
      console.error('API Init Error: postId not found in devvit context');
      res.status(400).json({
        status: 'error',
        message: 'postId is required but missing from context',
      });
      return;
    }

    try {
      const [count, username] = await Promise.all([
        redis.get('count'),
        reddit.getCurrentUsername(),
      ]);

      res.json({
        type: 'init',
        postId: postId || 'dev',
        count: count ? parseInt(count) : 0,
        username: username ?? 'anonymous',
      });
    } catch (error) {
      console.error(`API Init Error for post ${postId || 'dev'}:`, error);
      let errorMessage = 'Unknown error during initialization';
      if (error instanceof Error) {
        errorMessage = `Initialization failed: ${error.message}`;
      }
      res.status(400).json({ status: 'error', message: errorMessage });
    }
  }
);

router.post<{ postId: string }, IncrementResponse | { status: string; message: string }, unknown>(
  '/api/increment',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', 1),
      postId,
      type: 'increment',
    });
  }
);

router.post<{ postId: string }, DecrementResponse | { status: string; message: string }, unknown>(
  '/api/decrement',
  async (_req, res): Promise<void> => {
    const { postId } = context;
    if (!postId) {
      res.status(400).json({
        status: 'error',
        message: 'postId is required',
      });
      return;
    }

    res.json({
      count: await redis.incrBy('count', -1),
      postId,
      type: 'decrement',
    });
  }
);

// Dhwani Musical API Endpoints

/**
 * Create a new riff post with musical data
 */
router.post<{}, CreateRiffResponse | ApiErrorResponse, CreateRiffRequest>(
  '/api/create-riff',
  async (req, res): Promise<void> => {
    try {
      const { trackData, title } = req.body;

      if (!trackData) {
        res.status(400).json({
          success: false,
          message: 'trackData is required',
        });
        return;
      }

      // Get current user
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({
          success: false,
          message: 'User authentication required',
        });
        return;
      }

      // Generate post content
      const postTitle = generateRiffTitle(trackData, title);
      const preview = generateRiffPreview(trackData);

      // Create composition metadata
      const composition = generateCompositionMetadata(trackData, username);

      // Create custom post with splash screen and embedded data
      const post = await reddit.submitCustomPost({
        subredditName: context.subredditName!,
        title: postTitle,
        splash: {
          appDisplayName: 'Riff',
          backgroundUri: 'splash.png',
          heading: `Musical Riff by u/${username}`,
          buttonLabel: 'Play Music',
          description: preview,
        },
        textFallback: {
          text: `${preview}\n\n*This is a Riff post. Click to play!*`,
        },
        postData: {
          compositionId: composition.id,
          trackId: trackData.id,
          instrument: trackData.instrument,
          noteCount: trackData.notes.length,
          duration: trackData.duration,
          createdBy: username,
          createdAt: Date.now(),
        },
      });

      // Store composition data in Redis
      await storeComposition(post.id, composition);

      res.json({
        postId: post.id,
        success: true,
        message: 'Riff post created successfully',
      });
    } catch (error) {
      console.error('Error creating riff post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create riff post',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Create a jam reply with additional musical layer
 */
router.post<{}, CreateJamReplyResponse | ApiErrorResponse, CreateJamReplyRequest>(
  '/api/create-jam-reply',
  async (req, res): Promise<void> => {
    try {
      const { parentPostId, newTrackData, combinedComposition } = req.body;

      if (!parentPostId || !newTrackData || !combinedComposition) {
        res.status(400).json({
          success: false,
          message: 'parentPostId, newTrackData, and combinedComposition are required',
        });
        return;
      }

      // Get current user
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({
          success: false,
          message: 'User authentication required',
        });
        return;
      }

      // Generate comment text
      const commentText = generateJamReplyText(newTrackData);

      // Create Reddit comment (parentPostId should be in format t3_xxxxx)
      const formattedPostId = parentPostId.startsWith('t3_') ? parentPostId : `t3_${parentPostId}`;
      const comment = await reddit.submitComment({
        id: formattedPostId as `t3_${string}`,
        text: commentText,
      });

      // Store combined composition data in Redis
      await storeJamReply(comment.id, combinedComposition);

      res.json({
        commentId: comment.id,
        success: true,
        message: 'Jam reply created successfully',
      });
    } catch (error) {
      console.error('Error creating jam reply:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create jam reply',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Get composition data for a post
 */
router.post<{}, GetCompositionResponse | ApiErrorResponse>(
  '/api/get-composition',
  async (req, res): Promise<void> => {
    try {
      const { postId } = req.body;

      if (!postId) {
        res.status(400).json({
          success: false,
          message: 'postId is required in request body',
        });
        return;
      }

      const composition = await getComposition(postId);

      if (!composition) {
        res.status(404).json({
          success: false,
          message: 'Composition not found',
        });
        return;
      }

      res.json({
        composition,
        success: true,
      });
    } catch (error) {
      console.error('Error retrieving composition:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve composition',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Get composition data for a threaded jam session
 */
router.get<{}, GetThreadCompositionResponse | ApiErrorResponse>(
  '/api/get-thread-composition',
  async (req, res): Promise<void> => {
    try {
      const postId = req.query.postId as string;
      const commentId = req.query.commentId as string;

      if (!postId) {
        res.status(400).json({
          success: false,
          message: 'postId query parameter is required',
        });
        return;
      }

      let composition;
      let threadData;

      if (commentId) {
        // Get jam reply composition
        composition = await getJamReply(commentId);
        threadData = {
          postId,
          commentId,
          parentIds: [postId], // In a full implementation, this would trace the full thread
        };
      } else {
        // Get original post composition
        composition = await getComposition(postId);
        threadData = {
          postId,
          parentIds: [],
        };
      }

      if (!composition) {
        res.status(404).json({
          success: false,
          message: 'Composition not found',
        });
        return;
      }

      res.json({
        composition,
        threadData,
        success: true,
      });
    } catch (error) {
      console.error('Error retrieving thread composition:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve thread composition',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Submit challenge score as a comment reply
 */
router.post<{}, SubmitChallengeScoreResponse | ApiErrorResponse, SubmitChallengeScoreRequest>(
  '/api/submit-challenge-score',
  async (req, res): Promise<void> => {
    try {
      const { postId, score } = req.body;

      if (!postId || !score) {
        res.status(400).json({
          success: false,
          message: 'postId and score are required',
        });
        return;
      }

      // Get current user
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({
          success: false,
          message: 'User authentication required',
        });
        return;
      }

      // Update score with current user
      const updatedScore = {
        ...score,
        userId: username,
      };

      // Generate enhanced score comment text
      const scoreText =
        `🏆 **Challenge Score**\n\n` +
        `**Overall Score:** ${score.accuracy}% (Grade: ${getScoreGrade(score.accuracy)})\n` +
        `**Note Accuracy:** ${score.accuracy}%\n` +
        `**Timing Precision:** ${score.timing}%\n\n` +
        `*Completed on ${new Date(score.completedAt).toLocaleDateString()} at ${new Date(score.completedAt).toLocaleTimeString()}*\n\n` +
        `*Challenge yourself and see if you can beat this score!*`;

      // Create Reddit comment
      const formattedPostId = postId.startsWith('t3_') ? postId : `t3_${postId}`;
      const comment = await reddit.submitComment({
        id: formattedPostId as `t3_${string}`,
        text: scoreText,
      });

      // Store score data in Redis for leaderboards
      await storeChallengeScore(postId, username, updatedScore);

      res.json({
        success: true,
        message: 'Challenge score submitted successfully',
        commentId: comment.id,
      });
    } catch (error) {
      console.error('Error submitting challenge score:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to submit challenge score',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Get leaderboard for a riff post
 */
router.post<{}, GetLeaderboardResponse | ApiErrorResponse, GetLeaderboardRequest>(
  '/api/get-leaderboard',
  async (req, res): Promise<void> => {
    try {
      const { postId, limit = 10 } = req.body;

      if (!postId) {
        res.status(400).json({
          success: false,
          message: 'postId is required',
        });
        return;
      }

      const leaderboardData = await getLeaderboard(postId, limit);

      // Get detailed score information for each user
      const leaderboard = await Promise.all(
        leaderboardData.map(async (entry, index) => {
          const scores = await getChallengeScores(postId);
          const userScore = scores.find((s) => s.userId === entry.userId);

          return {
            userId: entry.userId,
            score: entry.score,
            rank: index + 1,
            completedAt: userScore?.completedAt || Date.now(),
          };
        })
      );

      res.json({
        leaderboard,
        success: true,
      });
    } catch (error) {
      console.error('Error retrieving leaderboard:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve leaderboard',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Get all challenge scores for a post
 */
router.post<{}, GetChallengeScoresResponse | ApiErrorResponse, GetChallengeScoresRequest>(
  '/api/get-challenge-scores',
  async (req, res): Promise<void> => {
    try {
      const { postId } = req.body;

      if (!postId) {
        res.status(400).json({
          success: false,
          message: 'postId is required',
        });
        return;
      }

      const scores = await getChallengeScores(postId);

      res.json({
        scores,
        success: true,
      });
    } catch (error) {
      console.error('Error retrieving challenge scores:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve challenge scores',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Create a challenge post with custom splash screen
 */
router.post<{}, CreateChallengeResponse | ApiErrorResponse, CreateChallengeRequest>(
  '/api/create-challenge',
  async (req, res): Promise<void> => {
    try {
      const { trackData, title, difficulty, challengeSettings } = req.body;

      if (!trackData) {
        res.status(400).json({
          success: false,
          message: 'trackData is required',
        });
        return;
      }

      // Get current user
      const username = await reddit.getCurrentUsername();
      if (!username) {
        res.status(401).json({
          success: false,
          message: 'User authentication required',
        });
        return;
      }

      // Calculate or use provided difficulty
      const calculatedDifficulty = difficulty || calculateDifficulty(trackData);

      // Use provided challenge settings or defaults
      const finalChallengeSettings = {
        allowedAttempts: challengeSettings?.allowedAttempts || 3,
        timeLimit: challengeSettings?.timeLimit || trackData.duration * 2,
        accuracyThreshold: challengeSettings?.accuracyThreshold || 70,
      };

      // Generate challenge-specific content
      const challengeTitle =
        title || `🏆 ${calculatedDifficulty} Musical Challenge by u/${username}`;
      const challengeDescription = `Can you play this ${trackData.instrument} riff? ${trackData.notes.length} notes in ${Math.round(trackData.duration / 1000)}s. Difficulty: ${calculatedDifficulty}`;

      // Create composition metadata
      const composition = generateCompositionMetadata(trackData, username);

      // Create custom challenge post with enhanced splash screen
      const post = await reddit.submitCustomPost({
        subredditName: context.subredditName!,
        title: challengeTitle,
        splash: {
          appDisplayName: 'Challenge',
          backgroundUri: 'splash.png',
          heading: `${calculatedDifficulty} Challenge by u/${username}`,
          buttonLabel: 'Accept Challenge',
          description: challengeDescription,
          appIconUri: 'default-icon.png',
        },
        textFallback: {
          text: `${challengeDescription}\n\n*This is a Dhwani musical challenge. Click to accept the challenge!*`,
        },
        postData: {
          type: 'challenge',
          compositionId: composition.id,
          trackId: trackData.id,
          instrument: trackData.instrument,
          noteCount: trackData.notes.length,
          duration: trackData.duration,
          difficulty: calculatedDifficulty,
          createdBy: username,
          createdAt: Date.now(),
          challengeSettings: finalChallengeSettings,
        },
      });

      // Store composition data in Redis with challenge flag
      const challengeComposition: CompositionData = {
        ...composition,
        metadata: {
          ...composition.metadata,
          challengeSettings: finalChallengeSettings,
        },
      };
      await storeComposition(post.id, challengeComposition);

      res.json({
        postId: post.id,
        success: true,
        message: 'Challenge post created successfully',
        difficulty: calculatedDifficulty,
      });
    } catch (error) {
      console.error('Error creating challenge post:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create challenge post',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

// Helper function to calculate difficulty based on track characteristics
function calculateDifficulty(trackData: TrackData): 'Easy' | 'Medium' | 'Hard' | 'Expert' {
  const { notes, duration } = trackData;
  const noteCount = notes.length;
  const noteDensity = noteCount / (duration / 1000); // Notes per second

  // Calculate velocity variations
  const velocities = notes.map((n) => n.velocity);
  const velocityVariation = Math.max(...velocities) - Math.min(...velocities);

  // Calculate timing complexity
  const timings = notes.map((n) => n.startTime);
  const avgTimingGap =
    timings.length > 1
      ? (Math.max(...timings) - Math.min(...timings)) / (timings.length - 1)
      : 1000;

  let difficultyScore = 0;

  // Note density scoring
  if (noteDensity > 8) difficultyScore += 3;
  else if (noteDensity > 5) difficultyScore += 2;
  else if (noteDensity > 2) difficultyScore += 1;

  // Velocity variation scoring
  if (velocityVariation > 0.6) difficultyScore += 2;
  else if (velocityVariation > 0.3) difficultyScore += 1;

  // Timing complexity scoring
  if (avgTimingGap < 200) difficultyScore += 2;
  else if (avgTimingGap < 500) difficultyScore += 1;

  // Note count scoring
  if (noteCount > 100) difficultyScore += 2;
  else if (noteCount > 50) difficultyScore += 1;

  if (difficultyScore >= 7) return 'Expert';
  if (difficultyScore >= 5) return 'Hard';
  if (difficultyScore >= 3) return 'Medium';
  return 'Easy';
}

// Helper function to get score grade
function getScoreGrade(score: number): string {
  if (score >= 95) return 'S';
  if (score >= 90) return 'A+';
  if (score >= 85) return 'A';
  if (score >= 80) return 'A-';
  if (score >= 75) return 'B+';
  if (score >= 70) return 'B';
  if (score >= 65) return 'B-';
  if (score >= 60) return 'C+';
  if (score >= 55) return 'C';
  return 'D';
}

router.post('/internal/on-app-install', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      status: 'success',
      message: `Post created in subreddit ${context.subredditName} with id ${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

router.post('/internal/menu/post-create', async (_req, res): Promise<void> => {
  try {
    const post = await createPost();

    res.json({
      navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}`,
    });
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    res.status(400).json({
      status: 'error',
      message: 'Failed to create post',
    });
  }
});

// Use router middleware
app.use(router);

// Get port from environment variable with fallback
const port = getServerPort();

const server = createServer(app);
server.on('error', (err) => console.error(`server error; ${err.stack}`));
server.listen(port);
