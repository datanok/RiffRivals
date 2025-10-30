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
  CreateChartRequest,
  CreateChartResponse,
  GetChartRequest,
  GetChartResponse,
  GetChartsRequest,
  GetChartsResponse,
  CreateRemixRequest,
  CreateRemixResponse,
  ApiErrorResponse,
} from '../shared/types/api.js';
import { redis, reddit, createServer, context, getServerPort } from '@devvit/web/server';
import { createPost } from './core/post.js';
import type { TrackData, CompositionData, ChartData } from '../shared/types/music.js';
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
  getChallengeAnalytics,
  getUserPersonalBest,
  storeChart,
  getChart,
  getCharts,
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
      const { trackData, title, challengeType = 'replication', challengeSettings } = req.body;

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
      const postTitle =
        challengeType === 'jam_session'
          ? title
            ? `🎵 ${title}`
            : `🎵 Jam Session - ${trackData.instrument.charAt(0).toUpperCase() + trackData.instrument.slice(1)}`
          : generateRiffTitle(trackData, title);
      const preview = generateRiffPreview(trackData);

      // Create composition metadata
      const composition = generateCompositionMetadata(trackData, username);

      // Handle jam sessions vs challenges differently
      let post;

      if (challengeType === 'jam_session') {
        // Jam sessions don't need challenge settings
        delete composition.metadata.challengeSettings;

        // Create jam session post
        post = await reddit.submitCustomPost({
          subredditName: context.subredditName!,
          title: postTitle,
          splash: {
            appDisplayName: '🎮 RiffRivals',
            backgroundUri: 'splash.png',
            heading: `🎵 ✨ JAM SESSION ✨ 🎵\nby u/${username}`,
            buttonLabel: '🎤 JOIN THE JAM! 🎤',
            description: `${preview}\n\n� COLLAbBORATIVE MUSIC CREATION 🌟\n🎶 Add your own layer to this jam! 🎶\n🎵 Let's make music together! 🎵`,
            appIconUri: 'default-icon.png',
          },
          textFallback: {
            text: `${preview}\n\n*This is a RiffRivals jam session. Click to add your layer!*`,
          },
          postData: {
            type: 'jam_session',
            compositionId: composition.id,
            trackId: trackData.id,
            instrument: trackData.instrument,
            noteCount: trackData.notes.length,
            duration: trackData.duration,
            createdBy: username,
            createdAt: Date.now(),
            challengeType,
          },
        });
      } else {
        // Update challenge settings for actual challenges
        composition.metadata.challengeSettings = {
          challengeType,
          baseDifficulty: 'auto',
          calculatedDifficulty: 0,
          scoringWeights:
            challengeType === 'replication'
              ? { timing: 0.3, accuracy: 0.7 }
              : { timing: 0.7, accuracy: 0.3 },
          allowedAttempts: challengeSettings?.allowedAttempts || 3,
          timeLimit: challengeSettings?.timeLimit || Math.ceil(trackData.duration),
          accuracyThreshold: challengeSettings?.accuracyThreshold || 70,
          leaderboard: [],
        };

        // Create challenge post
        post = await reddit.submitCustomPost({
          subredditName: context.subredditName!,
          title: postTitle,
          splash: {
            appDisplayName: 'RiffRivals',
            backgroundUri: 'splash.png',
            heading: `MUSIC CHALLENGE \nby u/${username}`,
            buttonLabel: 'ACCEPT CHALLENGE! ',
            appIconUri: 'default-icon.png',
          },
          textFallback: {
            text: `${preview}\n\n*This is a RiffRivals replication challenge. Click to play!*`,
          },
          postData: {
            type: 'replication',
            compositionId: composition.id,
            trackId: trackData.id,
            instrument: trackData.instrument,
            noteCount: trackData.notes.length,
            duration: trackData.duration,
            createdBy: username,
            createdAt: Date.now(),
            challengeType,
          },
        });
      }

      // Store composition data in Redis
      console.log(
        `🔵 [SERVER] Storing composition for postId: ${post.id}, challengeType: ${challengeType}`
      );
      await storeComposition(post.id, composition);
      console.log(`🔵 [SERVER] Composition stored successfully for postId: ${post.id}`);

      // If this is a jam session, add it to the jam sessions index
      if (challengeType === 'jam_session') {
        const jamSessionMetadata = {
          title: title || 'Untitled Jam Session',
          collaborators: [username],
          layerCount: 1,
          createdAt: Date.now(),
        };

        await redis.hSet('jam_sessions_index', {
          [post.id]: JSON.stringify(jamSessionMetadata),
        });

        console.log(`🔵 [SERVER] Added jam session to index: ${post.id}`);
      }

      res.json({
        postId: post.id,
        success: true,
        message:
          challengeType === 'jam_session'
            ? 'Jam session created successfully'
            : 'Challenge created successfully',
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

      // Get the original composition to check if user already contributed
      const originalComposition = await getComposition(parentPostId);
      if (originalComposition) {
        const userAlreadyContributed = originalComposition.layers.some(
          (layer) => layer.userId === username
        );

        if (userAlreadyContributed) {
          res.status(400).json({
            success: false,
            message:
              'You have already contributed to this jam session. Each user can only add one layer.',
          });
          return;
        }
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

      // Update jam sessions index since this is now a multi-layer composition
      if (combinedComposition.layers.length > 1) {
        const jamSessionMetadata = {
          title: combinedComposition.metadata.title || 'Untitled Jam Session',
          collaborators: combinedComposition.metadata.collaborators || [],
          layerCount: combinedComposition.layers.length,
          createdAt: combinedComposition.metadata.createdAt || Date.now(),
        };

        await redis.hSet('jam_sessions_index', {
          [parentPostId]: JSON.stringify(jamSessionMetadata),
        });
      }

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

      console.log(`🔵 [SERVER] Fetching composition for postId: ${postId}`);
      const composition = await getComposition(postId);

      if (!composition) {
        console.log(`🔵 [SERVER] Composition NOT FOUND for postId: ${postId}`);
        res.status(404).json({
          success: false,
          message: 'Composition not found',
        });
        return;
      }

      // Check if this is a jam session by looking at the jam sessions index
      const jamSessionsIndex = await redis.hGetAll('jam_sessions_index');
      const isJamSession = jamSessionsIndex && jamSessionsIndex[postId];

      console.log(
        `🔵 [SERVER] Composition found for postId: ${postId}, challengeType: ${composition.metadata.challengeSettings?.challengeType}, isJamSession: ${!!isJamSession}`
      );

      res.json({
        composition,
        success: true,
        isJamSession: !!isJamSession,
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
 * Submit challenge score with enhanced privacy options
 */
router.post<
  {},
  SubmitChallengeScoreResponse | ApiErrorResponse,
  SubmitChallengeScoreRequest & {
    shareOptions?: {
      shareFullScore: boolean;
      shareAccuracy: boolean;
      shareTiming: boolean;
      shareCompletion: boolean;
      sharePersonalBest: boolean;
      makePublicComment: boolean;
    };
    customMessage?: string;
  }
>('/api/submit-challenge-score', async (req, res): Promise<void> => {
  try {
    const { postId, score, shareOptions, customMessage } = req.body;

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

    let commentId: string | undefined;

    // Create public comment if user opted to share
    if (shareOptions?.makePublicComment) {
      // Generate comment text based on share options
      let scoreText = `🏆 **Challenge Complete by u/${username}**\n\n`;

      if (customMessage) {
        scoreText += `*"${customMessage}"*\n\n`;
      }

      if (shareOptions.shareFullScore) {
        scoreText +=
          `**Overall Score:** ${score.accuracy.toFixed(1)}% (Grade: ${getScoreGrade(score.accuracy)})\n` +
          `**Note Accuracy:** ${score.accuracy.toFixed(1)}%\n` +
          `**Timing Precision:** ${score.timing.toFixed(1)}%\n` +
          `**Perfect:** ${score.perfectHits} | **Great:** ${score.greatHits} | **Good:** ${score.goodHits} | **Miss:** ${score.missedNotes}\n\n`;
      } else {
        if (shareOptions.shareAccuracy) {
          scoreText += `**Accuracy:** ${score.accuracy.toFixed(1)}%\n`;
        }
        if (shareOptions.shareTiming) {
          scoreText += `**Timing:** ${score.timing.toFixed(1)}%\n`;
        }
        if (shareOptions.shareCompletion) {
          scoreText += `✅ **Challenge Completed by u/${username}!**\n`;
        }
        scoreText += '\n';
      }

      if (shareOptions.sharePersonalBest) {
        const personalBest = await getUserPersonalBest(postId, username);
        if (personalBest && personalBest.accuracy < score.accuracy) {
          scoreText += `🎉 **New Personal Best for u/${username}!** (Previous: ${personalBest.accuracy.toFixed(1)}%)\n\n`;
        }
      }

      scoreText += `*Completed by u/${username} on ${new Date(score.completedAt).toLocaleDateString()}*\n\n`;
      scoreText += `*Think you can beat u/${username}'s score? Give it a try!*`;

      // Create Reddit comment
      const formattedPostId = postId.startsWith('t3_') ? postId : `t3_${postId}`;
      const comment = await reddit.submitComment({
        id: formattedPostId as `t3_${string}`,
        text: scoreText,
      });
      commentId = comment.id;
    }

    // Store score data in Redis with privacy options
    await storeChallengeScore(postId, username, updatedScore, shareOptions);

    res.json({
      success: true,
      message: shareOptions?.makePublicComment
        ? 'Challenge score shared successfully'
        : 'Challenge score saved privately',
      commentId,
    });
  } catch (error) {
    console.error('Error submitting challenge score:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to submit challenge score',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * Get challenge analytics
 */
router.get<{ postId: string }, { analytics: any; success: boolean } | ApiErrorResponse>(
  '/api/challenge-analytics/:postId',
  async (req, res): Promise<void> => {
    try {
      const { postId } = req.params;

      if (!postId) {
        res.status(400).json({
          success: false,
          message: 'postId is required',
        });
        return;
      }

      const analytics = await getChallengeAnalytics(postId);

      res.json({
        analytics,
        success: true,
      });
    } catch (error) {
      console.error('Error retrieving challenge analytics:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve challenge analytics',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Get user's personal best
 */
router.get<
  { postId: string; userId: string },
  { personalBest: any; success: boolean } | ApiErrorResponse
>('/api/personal-best/:postId/:userId', async (req, res): Promise<void> => {
  try {
    const { postId, userId } = req.params;

    if (!postId || !userId) {
      res.status(400).json({
        success: false,
        message: 'postId and userId are required',
      });
      return;
    }

    // Only allow users to see their own personal best
    const currentUser = await reddit.getCurrentUsername();
    if (currentUser !== userId) {
      res.status(403).json({
        success: false,
        message: 'You can only view your own personal best',
      });
      return;
    }

    const personalBest = await getUserPersonalBest(postId, userId);

    res.json({
      personalBest,
      success: true,
    });
  } catch (error) {
    console.error('Error retrieving personal best:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to retrieve personal best',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

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
        challengeType: 'replication' as const,
        baseDifficulty: 'auto' as const,
        calculatedDifficulty: 0,
        scoringWeights: { timing: 0.3, accuracy: 0.7 },
        allowedAttempts: challengeSettings?.allowedAttempts || 3,
        timeLimit: challengeSettings?.timeLimit || trackData.duration * 2,
        accuracyThreshold: challengeSettings?.accuracyThreshold || 70,
        leaderboard: [],
      };

      // Generate challenge-specific content
      const challengeTitle =
        title || `🏆 ${calculatedDifficulty} Musical Challenge by u/${username}`;
      const challengeDescription = `Can you play this ${trackData.instrument} riff? ${trackData.notes.length} notes  Difficulty: ${calculatedDifficulty}`;

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
      console.log(
        `🔵 [SERVER] Storing challenge composition for postId: ${post.id}, challengeType: ${finalChallengeSettings.challengeType}`
      );
      await storeComposition(post.id, challengeComposition);
      console.log(`🔵 [SERVER] Challenge composition stored successfully for postId: ${post.id}`);

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

/**
 * Create a new chart (Falling Tiles level)
 */
router.post<{}, CreateChartResponse | ApiErrorResponse, CreateChartRequest>(
  '/api/create-chart',
  async (req, res): Promise<void> => {
    try {
      const { chartData } = req.body;

      if (!chartData) {
        res.status(400).json({
          success: false,
          message: 'chartData is required',
        });
        return;
      }

      // Validate chart data
      if (
        !chartData.title ||
        !chartData.instrument ||
        !chartData.notes ||
        chartData.notes.length === 0
      ) {
        res.status(400).json({
          success: false,
          message: 'Chart must have a title, instrument, and at least one note',
        });
        return;
      }

      // Validate that chart is cleared
      if (!chartData.cleared) {
        res.status(400).json({
          success: false,
          message: 'You must successfully clear your own chart before publishing!',
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

      // Update chart with creator info
      const finalChart: ChartData = {
        ...chartData,
        createdBy: username,
        createdAt: Date.now(),
      };

      // Generate post content
      const postTitle = `🎼 ${chartData.title} [${chartData.instrument.toUpperCase()}] - ${chartData.difficulty.toUpperCase()}`;
      const preview =
        `Falling Tiles Chart\n` +
        `🎵 Instrument: ${chartData.instrument}\n` +
        `🎯 Difficulty: ${chartData.difficulty}\n` +
        `🎹 Notes: ${chartData.notes.length}\n` +
        `✅ Cleared by creator`;

      // Create custom post
      const post = await reddit.submitCustomPost({
        subredditName: context.subredditName!,
        title: postTitle,
        splash: {
          appDisplayName: '🎮 RiffRivals',
          backgroundUri: 'splash.png',
          heading: `🎼 ⚡ FALLING TILES CHART ⚡ 🎼\nby u/${username}`,
          buttonLabel: '🎵 PLAY CHART! 🎵',
          description: `${preview}\n\n🎯 CUSTOM RHYTHM CHALLENGE! 🎯\n🎶 Hit the notes as they fall! 🎶\n⭐ Master the rhythm! ⭐`,
          appIconUri: 'default-icon.png',
        },
        textFallback: {
          text: `${preview}\n\n*This is a RiffRivals Falling Tiles chart. Click to play!*`,
        },
        postData: {
          type: 'chart',
          chartId: finalChart.id,
          instrument: finalChart.instrument,
          difficulty: finalChart.difficulty,
          duration: finalChart.duration,
          bpm: finalChart.bpm,
          noteCount: finalChart.notes.length,
          createdBy: username,
          createdAt: finalChart.createdAt,
          cleared: true,
        },
      });

      // Store chart data in Redis
      await storeChart(post.id, finalChart);

      res.json({
        postId: post.id,
        chartId: finalChart.id,
        success: true,
        message: 'Chart published successfully',
      });
    } catch (error) {
      console.error('Error creating chart:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create chart',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Get a specific chart by post ID
 */
router.get<{ postId: string }, GetChartResponse | ApiErrorResponse>(
  '/api/get-chart/:postId',
  async (req, res): Promise<void> => {
    try {
      const { postId } = req.params;

      if (!postId) {
        res.status(400).json({
          success: false,
          message: 'postId is required',
        });
        return;
      }

      const chart = await getChart(postId);

      if (!chart) {
        res.status(404).json({
          success: false,
          message: 'Chart not found',
        });
        return;
      }

      res.json({
        chart,
        success: true,
      });
    } catch (error) {
      console.error('Error retrieving chart:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve chart',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Get charts with optional filters
 */
router.get<{}, GetChartsResponse | ApiErrorResponse>(
  '/api/get-charts',
  async (req, res): Promise<void> => {
    try {
      const { instrument, difficulty, limit = '20', offset = '0' } = req.query;

      const { charts, total } = await getCharts(
        instrument as string | undefined,
        difficulty as 'easy' | 'medium' | 'hard' | undefined,
        parseInt(limit as string),
        parseInt(offset as string)
      );

      res.json({
        charts,
        total,
        success: true,
      });
    } catch (error) {
      console.error('Error retrieving charts:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve charts',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Create a remix of an existing challenge
 */
router.post<{}, CreateRemixResponse | ApiErrorResponse, CreateRemixRequest>(
  '/api/create-remix',
  async (req, res): Promise<void> => {
    try {
      const { parentPostId, trackData, title } = req.body;

      if (!parentPostId || !trackData) {
        res.status(400).json({
          success: false,
          message: 'parentPostId and trackData are required',
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

      // Get parent composition to link lineage
      const parentComposition = await getComposition(parentPostId);
      if (!parentComposition) {
        res.status(404).json({
          success: false,
          message: 'Parent challenge not found',
        });
        return;
      }

      // Generate post content
      const postTitle = title || `🔄 Remix of "${parentComposition.metadata.title || 'Untitled'}"`;
      const preview =
        generateRiffPreview(trackData) +
        `\n\n🔄 Remixed from original by u/${parentComposition.metadata.collaborators[0] || 'unknown'}`;

      // Create composition with lineage
      const composition = generateCompositionMetadata(trackData, username);
      composition.metadata.title = postTitle;
      composition.metadata.challengeSettings = {
        challengeType: 'replication',
        baseDifficulty: 'auto',
        calculatedDifficulty: 0,
        scoringWeights: { timing: 0.3, accuracy: 0.7 },
        allowedAttempts: 3,
        timeLimit: Math.ceil(trackData.duration),
        accuracyThreshold: 70,
        leaderboard: [],
      };

      // Create custom post
      const post = await reddit.submitCustomPost({
        subredditName: context.subredditName!,
        title: postTitle,
        splash: {
          appDisplayName: '🎮 RiffRivals',
          backgroundUri: 'splash.png',
          heading: `🔄 ✨ REMIX CREATION ✨ 🔄\nby u/${username}`,
          buttonLabel: '🎧 PLAY REMIX! 🎧',
          description: `${preview}\n\n🎵 CREATIVE REMIX CHALLENGE! 🎵\n🔥 A fresh take on the original! 🔥\n🌟 Experience the remix! 🌟`,
          appIconUri: 'default-icon.png',
        },
        textFallback: {
          text: `${preview}\n\n*This is a RiffRivals remix. Click to play!*`,
        },
        postData: {
          compositionId: composition.id,
          trackId: trackData.id,
          instrument: trackData.instrument,
          noteCount: trackData.notes.length,
          duration: trackData.duration,
          createdBy: username,
          createdAt: Date.now(),
          parentPostId: parentPostId,
          isRemix: true,
        },
      });

      // Store composition data
      await storeComposition(post.id, composition);

      res.json({
        postId: post.id,
        success: true,
        message: 'Remix created successfully',
      });
    } catch (error) {
      console.error('Error creating remix:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to create remix',
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }
);

/**
 * Get recent jam sessions for the home screen
 */
router.get('/api/get-recent-jams', async (_req, res): Promise<void> => {
  try {
    // Get jam sessions index from Redis hash
    const jamSessionsIndex = await redis.hGetAll('jam_sessions_index');
    const jamSessions = [];

    if (jamSessionsIndex) {
      for (const [postId, metadataStr] of Object.entries(jamSessionsIndex)) {
        try {
          const metadata = JSON.parse(metadataStr);
          jamSessions.push({
            postId,
            title: metadata.title || 'Untitled Jam Session',
            collaborators: metadata.collaborators || [],
            layerCount: metadata.layerCount || 1,
            createdAt: metadata.createdAt || Date.now(),
          });
        } catch (parseError) {
          console.error(`Error parsing jam session metadata for postId ${postId}:`, parseError);
          // Continue with other jam sessions
        }
      }
    }

    // Sort by creation date (newest first) and limit to 10
    jamSessions.sort((a, b) => b.createdAt - a.createdAt);
    const recentJamSessions = jamSessions.slice(0, 10);

    res.json({
      success: true,
      jamSessions: recentJamSessions,
    });
  } catch (error) {
    console.error('Error fetching recent jam sessions:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch recent jam sessions',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

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
