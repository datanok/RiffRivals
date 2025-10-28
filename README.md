# RiffRivals – Rhythm Battles Built by the Community

**RiffRivals** is a Reddit-integrated rhythm platform where users make challenges for each other — not against the computer. Built on Reddit's Devvit platform, RiffRivals turns every post into a playable rhythm challenge that the community can attempt, score, and remix.

## What is RiffRivals?

RiffRivals is a rhythm battle platform where creativity meets competition. Users create two types of challenges:

1. **Replication Challenges**: Record a short musical loop on virtual instruments (drums, piano, or synth), and others must match your rhythm accuracy and timing
2. **Falling Tiles Charts**: Design your own rhythm game levels like Beat Saber or Osu! using a visual beatmap editor

The app features professional browser-based virtual instruments built with React and Tone.js: an 8-piece drum kit, a polyphonic piano, and an electronic synth. Every challenge is published as a Reddit post, where the community can play, score, upvote, and remix the best creations.

### Core Features

- **🎸 Create Mode**: Record short musical loops (10-20 seconds) on drums, piano, or synth. Your recording becomes a replication challenge where others must match your rhythm and timing
- **🎼 Chart Creator Mode**: Build your own Falling Tiles level using a visual beatmap editor. Place notes, set BPM, test your chart, and publish for others to play
- **🎮 Play Challenges**: Attempt community-created challenges in two styles:
  - **Replication**: Listen and play back the rhythm as accurately as possible
  - **Falling Tiles**: Hit notes as they fall down the screen, Guitar Hero style
- **🏆 Compete & Score**: Every attempt is scored on timing accuracy and note precision. Climb the leaderboards and prove your rhythm skills
- **🔄 Remix System**: Found a great challenge? Remix it with your own twist and publish as a new challenge
- **🌍 Community-Driven**: The best challenges rise to the top through Reddit's voting system. Every post is a playable rhythm game

## What Makes RiffRivals Innovative?

### 🚀 **Player-Made Rhythm Games**

- **Community as Game Designers**: Every user can create playable rhythm challenges. The community decides what's fun through voting
- **Two Creative Paths**: Record live performances OR design levels with a visual editor. Different skills, same competitive spirit
- **Must Clear to Publish**: Chart creators must successfully play through their own level before posting. Ensures every challenge is fair and playable
- **Native Reddit Integration**: Challenges are Reddit posts stored in Redis. Play, comment, vote, and discuss without leaving Reddit

### 🎹 **Professional Browser-Based Virtual Instruments**

- **🥁 Advanced Drum Kit**: 8-piece electronic drum set (Kick, Snare, Hi-Hat, Open Hat, Crash, Ride, Tom 1, Tom 2) with velocity-sensitive pads and realistic Tone.js synthesis
- **🎹 Polyphonic Piano**: Full chromatic keyboard with authentic piano sounds using PolySynth and chord support for complex melodies
- **🎺 Electronic Synth**: Versatile synthesizer for creating electronic sounds and lead melodies
- **🔊 Tone.js Audio Engine**: Professional-grade Web Audio API synthesis delivering studio-quality sound directly in the browser

### 🎼 **Visual Chart Creator**

- **Timeline Grid Editor**: Place notes on a BPM-synced timeline with snap-to-grid functionality
- **Multi-Lane System**: 4-6 lanes for different drum sounds or melodic notes
- **Real-Time Preview**: Test your chart by playing it in Falling Tiles mode before publishing
- **Difficulty Auto-Calculation**: System analyzes note density, BPM, and complexity to assign difficulty ratings
- **Validation System**: Ensures charts have proper timing alignment, reasonable note density, and no overlapping notes

### 🏆 **Competitive Scoring System**

- **Dual Scoring Metrics**: Every challenge is scored on both timing accuracy (rhythm precision) and note accuracy (correct notes played)
- **Leaderboards**: Compete for the top spot on each challenge. Scores are stored in Redis and displayed on challenge posts
- **Grade System**: Earn grades from S-rank (perfect) down to D-rank based on your performance
- **Remix Challenges**: Take any existing challenge and create your own variation. Original creator gets credit through parentPostId linking

### 🔧 **Advanced Audio Technology**

- **Real-Time Synthesis**: Live audio generation with sub-millisecond timing precision using Web Audio API with automatic latency compensation
- **Multi-Track Playback**: Individual track muting, soloing, and volume control with visual waveform representation and synchronized playback
- **Composition Management**: Advanced layering, mixing, and track organization with real-time composition statistics and validation
- **Smart Compression**: Automatic musical data optimization for Reddit's 4MB platform limits while maintaining audio quality through efficient JSON serialization

## How to Play Dhwani

### 🎯 **Creating Your First Musical Riff**

1. **🚀 Launch the App**:

   - Open a Dhwani post in your Reddit feed
   - The app automatically loads with the main dashboard
   - If no composition exists, you'll see the "Create New Composition" interface
   - The app initializes the Tone.js audio engine and loads all virtual instruments

2. **🎵 Choose Your Instrument**:

   - In the Recording Studio section, select from three professional virtual instruments:
     - **🥁 Drum Kit**: 8-piece electronic drum set (Kick, Snare, Hi-Hat, Open Hat, Crash, Ride, Tom 1, Tom 2) for rhythm and percussion
     - **🎹 Piano**: Polyphonic keyboard for melody and harmony with 7-octave range (Octave 1-7) and chord support
     - **🎸 Bass Guitar**: 4-string bass (E-A-D-G tuning) with 13-fret range (0-12 frets) for low-end foundation
   - Each instrument interface appears in the black instrument panel with unique controls and real-time visual feedback

3. **⏺️ Start Recording**:

   - Click the red "Start Recording" button in the Recording Studio
   - The button changes to show recording status with a pulsing red dot and timer
   - Note counter shows how many notes you've played in real-time
   - The DhwaniAudioEngine begins capturing note events with precise timestamps

4. **🎶 Play Your Musical Part**:

   - **Drums**: Click the 8 drum pads arranged in realistic drum kit formation
     - Each pad triggers specific Tone.js synthesis (MembraneSynth for kick/toms, NoiseSynth for cymbals/snare)
     - Pads glow red when struck with velocity-sensitive response
     - Visual feedback shows active drum hits during playback
   - **Piano**: Click piano keys with traditional white and black key layout
     - Use +/- octave controls to access different pitch ranges
     - PolySynth enables playing single notes or complex chords simultaneously
     - Keys depress visually when played with note name display
   - **Bass**: Select fret position (0-12) then click strings (E, A, D, G)
     - Fret selector grid shows current position with red highlighting
     - MonoSynth generates authentic bass tones with low-pass filtering
     - Strings glow green when played with automatic note calculation

5. **⏹️ Stop & Add Track**:

   - Click "Stop & Add Track" when your performance is complete
   - Your recording automatically becomes a TrackData object in the composition
   - The system calculates duration, note count, and timing information
   - Use "Clear" button to discard and re-record if needed

6. **🎼 Build Your Composition**:

   - Switch instruments using the InstrumentSelector component
   - Record additional layers that automatically sync with existing tracks
   - Each track appears in the CompositionManager with individual controls
   - Preview your multi-track composition with the PlaybackEngine

7. **📝 Save & Share**:
   - Add a title in the composition metadata section
   - Click "Save Composition" to create a Reddit post via the `/api/create-riff` endpoint
   - Your musical creation becomes a shareable Reddit post stored in Redis
   - Other users can now jam on your composition through the reply system

### 🎸 **Jamming on Existing Riffs (Collaborative Mode)**

1. **🔍 Find a Musical Riff**:

   - Browse Dhwani posts in your subreddit with musical emojis (🎵, 🥁, 🎹, 🎸)
   - Click "View Post" mode to see existing musical compositions
   - The RiffPost component loads the original composition from Redis via `/api/get-composition`
   - View track information, collaborator list, and composition statistics

2. **🎤 Start a Jam Session**:

   - Click the green "Jam on this" button on any musical post
   - The app switches to JamReply mode showing the original tracks
   - The PlaybackEngine loads all existing layers for reference playback
   - Original composition metadata displays collaborators and creation history

3. **🎼 Choose Your Complementary Instrument**:

   - Select from the InstrumentSelector (different from the original for variety)
   - Consider musical complementarity based on existing tracks:
     - Add drums to a piano melody for rhythmic foundation
     - Add bass to a drum rhythm for harmonic support
     - Add piano harmony to a bass line for melodic richness
   - The interface prevents conflicts and suggests complementary instruments

4. **🎵 Record Your Musical Layer**:

   - The AudioRecorder component plays reference tracks while you record
   - Your new recording automatically synchronizes with the existing composition timing
   - Visual feedback shows both original and new track activity with real-time note highlighting
   - The DhwaniAudioEngine ensures perfect timing alignment with existing layers

5. **👀 Preview Combined Result**:

   - Use "Preview Combined Composition" to hear original + your addition
   - The PlaybackEngine renders all tracks simultaneously with individual mute/solo controls
   - Visual track indicators show which instruments are currently playing
   - Verify your musical contribution enhances the original composition

6. **💬 Submit Your Jam Reply**:

   - Click "Post Jam Reply" to add your layer as a Reddit comment via `/api/create-jam-reply`
   - Your musical contribution becomes part of the threaded conversation
   - The combined CompositionData is stored in Redis with updated collaborator list
   - The system generates descriptive comment text with track information

7. **🔄 Continue the Collaboration**:
   - Others can jam on your combined composition, adding even more layers
   - Each reply builds on the previous musical conversation with full version history
   - Complex multi-instrument arrangements emerge through community collaboration
   - The threading system preserves the complete musical evolution

### 🎵 **Mastering the Virtual Instruments**

#### **🥁 Drum Kit Interface**

- **Layout**: 8 drum pads arranged in realistic drum kit formation using CSS Grid (3x4 layout)
- **Drum Sounds Available** (powered by Tone.js synthesis):
  - **Kick**: MembraneSynth (C1) for deep bass drum rhythm foundation
  - **Snare**: NoiseSynth with high-pass filter (1000Hz) for sharp backbeat
  - **Hi-Hat**: NoiseSynth with tight envelope (50ms decay) and high-pass filter (8000Hz)
  - **Open Hat**: NoiseSynth with longer decay (300ms) and high-pass filter (6000Hz)
  - **Crash**: NoiseSynth with long decay (2s) and high-pass filter (4000Hz)
  - **Ride**: NoiseSynth with sustain (200ms) and high-pass filter (3000Hz)
  - **Tom 1**: MembraneSynth (F2) for high tom fills and transitions
  - **Tom 2**: MembraneSynth (C2) for low tom deeper fills
- **Playing Technique**: Click or tap pads with velocity sensitivity (0.1-1.0 range)
- **Visual Feedback**: Pads glow red when struck (#ff6b6b color) with 100ms highlight duration
- **Recording Status**: Real-time "● REC" indicator with note counter during active recording

#### **🎹 Piano Interface**

- **Layout**: Full chromatic keyboard with traditional white (40px width) and black (24px width) key arrangement
- **Range**: 7 octaves (Octave 1-7) with +/- octave controls for pitch range selection
- **Synthesis**: Tone.js PolySynth with exponential ADSR envelope and built-in reverb (2.0s decay, 20% wet)
- **Playing Technique**:
  - Click individual white keys (C, D, E, F, G, A, B) for natural notes
  - Click black keys (C#, D#, F#, G#, A#) for sharp/flat notes positioned between white keys
  - Click multiple keys simultaneously for polyphonic chord playing
  - Use octave +/- buttons to access different pitch ranges (clamped to 1-7 range)
- **Visual Feedback**: Keys depress when played (white keys turn gray, black keys lighten) with 100ms animation
- **Polyphonic Capability**: Unlimited simultaneous notes for rich harmonies and complex chords
- **Note Display**: Each key shows its note name with octave number for easy identification

#### **🎸 Bass Guitar Interface**

- **Fret Selection**: 13-position fret selector grid (frets 0-12) with current fret highlighting in red
- **String Configuration**: 4 strings in standard bass tuning using MonoSynth with low-pass filtering:
  - **G String** (G2): Higher bass notes for melodic lines and walking basslines
  - **D String** (D2): Mid-range bass notes for harmonic support and chord roots
  - **A String** (A1): Low-mid bass notes for rhythm foundation and groove
  - **E String** (E1): Deep bass notes for fundamental low-end and sub-bass
- **Playing Technique**:
  - First select fret position using the numbered fret grid (0 = open string)
  - Click any string button to play that note at the selected fret
  - Each string displays the current note name calculated from fret position
- **Visual Feedback**:
  - Strings glow green (#4CAF50) when played with 100ms highlight duration
  - Fret selector highlights current position in red (#ff6b6b)
  - Note names update dynamically based on fret selection and string tuning
- **Note Calculation**: Automatic chromatic note calculation based on standard bass tuning and fret mathematics with octave handling

### 🏆 **Challenge Mode (Advanced Feature)**

1. **🎯 Select a Challenge**:

   - Click the orange "Challenge Mode" button on any musical post
   - The ChallengeMode component loads showing the original track details
   - Challenge track information displays: instrument type, note count, duration, tempo, and collaborator
   - The system prepares the original TrackData for replication scoring

2. **📚 Study Phase**:

   - Click "Listen to Original" to study the track you need to replicate
   - The PlaybackEngine plays the original with visual feedback showing note timing and patterns
   - Listen multiple times to memorize the rhythm and note sequence
   - Challenge instructions explain the scoring algorithm and tolerance levels

3. **⏰ Ready Phase**:

   - Click "Start Challenge" when ready to attempt replication
   - 3-second countdown (setInterval with 1000ms) prepares you for recording
   - The interface switches to recording mode with the appropriate instrument interface
   - The DhwaniAudioEngine initializes for precise timing capture

4. **🎵 Record Your Attempt**:

   - Play the same instrument as the original track using the matching interface
   - Try to replicate both the correct notes and precise timing within 100ms tolerance
   - Visual feedback shows your performance in real-time with note highlighting
   - AudioRecorder captures NoteEvents with precise timestamps for comparison

5. **📊 Receive Detailed Scoring**:

   - **Note Accuracy**: Percentage of correct notes played (compared to original NoteEvents)
   - **Timing Precision**: How closely your timing matches the original (100ms tolerance window)
   - **Overall Score**: Weighted average (70% note accuracy + 30% timing precision)
   - **Letter Grade**: S (95%+), A+ (90%+), A (85%+), A- (80%+), B+ (75%+), B (70%+), B- (65%+), C+ (60%+), C (55%+), D (<55%)
   - **Detailed Breakdown**: Shows total notes, correct notes, and timing error analysis

6. **🎧 Compare Recordings**:

   - Listen to both the original and your attempt side-by-side using dual PlaybackEngines
   - Analyze where you succeeded and where you can improve with visual comparison
   - Timing differences and missed notes highlighted in the scoring breakdown
   - Real-time playback comparison shows performance accuracy

7. **🏅 Share Your Achievement**:
   - Click "Submit Score" to post your ChallengeScore as a Reddit comment via `/api/submit-challenge-score`
   - Your score appears with grade, accuracy percentages, completion date, and detailed breakdown
   - Scores stored in Redis with leaderboard functionality for community ranking
   - Build reputation in the community as a skilled musical replicator with persistent scoring history

### 🎛️ **Advanced Playback & Mixing Controls**

- **▶️ PlaybackEngine Component**:

  - Large play/pause button (10x10 size) for main playback control with state management
  - Progress bar with scrubbing capability using HTML5 range input for seeking to specific times
  - Time display showing current position and total duration in MM:SS format with real-time updates
  - Stop button to return to beginning and halt playback with cleanup of scheduled events

- **🎚️ Track Management System**:

  - **Mute (M)**: Red button to silence individual instrument tracks with Set-based state management
  - **Solo (S)**: Yellow button to play only selected tracks, muting all others with priority logic
  - **Track Info**: Each track shows instrument type, note count, duration, and creation timestamp
  - **Visual Indicators**: Active tracks show green pulse dots (2x2 size) during playback with real-time updates

- **👁️ Visual Feedback System**:

  - Real-time highlighting shows which instruments are currently playing using activeNotes Set
  - Active notes display on instrument interfaces during playback with 200ms highlight duration
  - Track activity indicators show which layers are currently producing sound
  - Progress visualization with percentage completion and smooth transitions

- **🔄 CompositionManager Integration**:
  - View all collaborators who contributed to the composition with user filtering
  - Track listing with individual controls for each layer including reordering and duplication
  - Composition metadata showing title, creation date, and collaboration history with editing capabilities
  - JSON serialization functionality for advanced users and debugging with compression optimization

### 🎮 **Tips for Musical Success**

- **🎵 Start Simple**: Begin with basic rhythms (simple drum patterns) or melodies (single-note piano lines) before attempting complex compositions - the system handles timing automatically
- **👂 Listen First**: Always use the PlaybackEngine to listen to existing compositions multiple times before adding your layer - understand the musical context
- **🎼 Complement, Don't Compete**: Choose instruments that enhance rather than clash with existing parts:
  - Add drums to melodic compositions for rhythmic foundation
  - Add bass to drum tracks for harmonic support and low-end
  - Add piano to rhythm sections for melodic interest and chord progressions
- **⏰ Keep Time**: Use the visual feedback (glowing instruments, note highlighting) to stay in sync with existing tracks - the DhwaniAudioEngine provides sub-millisecond timing precision
- **🔄 Practice with Challenge Mode**: Improve your timing and accuracy by replicating existing riffs for scoring - aim for 100ms timing tolerance
- **🎹 Master Each Instrument**:
  - **Drums**: Learn basic patterns (kick on 1&3, snare on 2&4) using the 8-pad layout
  - **Piano**: Practice scales and simple chord progressions with polyphonic capability
  - **Bass**: Focus on root notes and simple walking basslines using the fret/string system
- **🤝 Collaborate Thoughtfully**: Engage with other musicians through Reddit comments and build on their musical ideas - each reply creates a new musical version
- **📱 Mobile & Desktop**: The React interface works seamlessly on both platforms with touch-optimized controls - create music anywhere you have internet access
- **🎚️ Use Mixing Controls**: Mute/solo tracks in the PlaybackEngine to isolate parts and understand how they fit together
- **💾 Save Frequently**: Use "Save Composition" regularly to preserve your work as Reddit posts stored in Redis - compositions are automatically validated for size limits

## Technical Stack

- **[Devvit](https://developers.reddit.com/)**: Reddit's developer platform for native app integration with Redis storage and Reddit API access
- **[React 19.1.0](https://react.dev/)**: Modern UI framework for interactive components with StrictMode and createRoot
- **[Tone.js 15.1.3](https://tonejs.github.io/)**: Web Audio API library for music synthesis with PolySynth, MonoSynth, MembraneSynth, and NoiseSynth
- **[TypeScript 5.8.2](https://www.typescriptlang.org/)**: Type-safe development with strict project references and shared types
- **[Vite 6.2.4](https://vite.dev/)**: Fast build tool and development server with client/server separation
- **[Express 5.1.0](https://expressjs.com/)**: Server-side API for Reddit integration with JSON body parsing and CORS handling
- **[Tailwind CSS 4.1.6](https://tailwindcss.com/)**: Utility-first styling with responsive design and component-based architecture

## Getting Started for Developers

> Make sure you have Node.js 22.2.0+ installed before running!

1. **Clone & Install**:

   ```bash
   git clone <repository-url>
   cd riffrivals
   npm install
   ```

   This automatically runs `npm run build` via postinstall script

2. **Development Server**:

   ```bash
   npm run dev
   ```

   This starts three concurrent processes:

   - Client build watcher (`vite build --watch` in src/client)
   - Server build watcher (`vite build --watch` in src/server)
   - Devvit playtest environment (`devvit playtest`)

3. **Access Your App**: Open the provided Reddit playtest URL (typically `https://www.reddit.com/r/riffrivals_dev?playtest=riffrivals`) to test your app live on Reddit with full audio functionality

## Development Commands

- `npm run dev`: Starts concurrent development with client/server watchers and Devvit playtest
- `npm run build`: Builds both client (`dist/client`) and server (`dist/server`) bundles for production
- `npm run build:client`: Builds only client bundle with Vite
- `npm run build:server`: Builds only server bundle with Vite (CommonJS output)
- `npm run deploy`: Uploads new version to Reddit (`npm run build && devvit upload`)
- `npm run launch`: Publishes app for Reddit review and approval (`npm run build && npm run deploy && devvit publish`)
- `npm run check`: Runs TypeScript checks, ESLint fixes, and Prettier formatting
- `npm run type-check`: Runs TypeScript compilation check across all project references

## Project Structure

```
src/
├── client/                 # React frontend (runs in Reddit webview)
│   ├── components/        # UI components
│   │   ├── instruments/   # Virtual instrument interfaces
│   │   │   ├── InstrumentSelector.tsx  # Instrument switching component
│   │   │   ├── DrumKit.tsx            # 8-piece drum kit interface
│   │   │   ├── Piano.tsx              # Polyphonic piano keyboard
│   │   │   └── Bass.tsx               # 4-string bass guitar interface
│   │   ├── AudioRecorder.tsx          # Recording system with timing
│   │   ├── PlaybackEngine.tsx         # Multi-track playback with mixing
│   │   ├── CompositionManager.tsx     # Track management and metadata
│   │   ├── RiffPost.tsx              # Main post display component
│   │   ├── JamReply.tsx              # Collaborative reply interface
│   │   └── ChallengeMode.tsx         # Skill challenge system
│   ├── audio/            # Tone.js audio engine
│   │   ├── DhwaniAudioEngine.ts      # Main audio engine with IAudioEngine
│   │   ├── DrumKitSynth.ts           # MembraneSynth + NoiseSynth drums
│   │   ├── PianoSynth.ts             # PolySynth with reverb
│   │   └── BassSynth.ts              # MonoSynth with filtering
│   ├── utils/            # Utility functions
│   │   └── compositionUtils.ts       # Serialization and validation
│   ├── main.tsx          # React entry point with StrictMode
│   ├── App.tsx           # Main application component with routing
│   └── index.html        # HTML template with viewport meta
├── server/               # Express backend (Reddit integration)
│   ├── index.ts          # Main server with API endpoints
│   ├── core/             # Business logic
│   │   └── post.ts       # Post creation functionality
│   └── utils/            # Server utilities
│       ├── redisUtils.ts # Redis storage operations
│       └── postUtils.ts  # Reddit post generation
├── shared/               # Shared types and constants
│   ├── types/           # TypeScript interfaces
│   │   ├── music.ts     # Musical data structures
│   │   ├── audio.ts     # Audio engine interfaces
│   │   ├── api.ts       # API request/response types
│   │   └── ui.ts        # UI component prop types
│   ├── constants/       # Configuration constants
│   │   ├── audio.ts     # Audio synthesis configuration
│   │   └── ui.ts        # UI styling and layout constants
│   └── index.ts         # Main export file for shared code
├── devvit.json          # Devvit app configuration with post/server entry points
└── package.json         # Dependencies and build scripts with concurrent dev
```

## Features Status

### ✅ **Completed Features**

- **Virtual Instrument Interfaces**: Complete DrumKit, Piano, and Bass components with Tone.js synthesis
- **Real-Time Audio Synthesis**: DhwaniAudioEngine with MembraneSynth, PolySynth, MonoSynth, and NoiseSynth
- **Recording and Playback System**: AudioRecorder and PlaybackEngine with precise timing and multi-track support
- **Multi-Track Composition Management**: CompositionManager with track layering, muting, soloing, and metadata
- **Visual Feedback System**: Real-time note highlighting, instrument glowing, and playback indicators
- **Instrument Switching**: InstrumentSelector with smooth transitions and state management
- **Musical Data Serialization**: Complete TrackData and CompositionData validation with compression
- **Reddit Integration**: Full server-side API with post creation, jam replies, and composition storage
- **Challenge Mode**: Complete scoring system with note accuracy and timing precision analysis
- **Collaborative Workflow**: Full jam session system with threaded musical conversations

### 🚧 **In Development**

- **Mobile Touch Optimization**: Enhanced touch controls for mobile Reddit users
- **Performance Optimization**: Audio context management and memory cleanup improvements
- **Error Handling Enhancement**: Comprehensive error recovery and user feedback systems

### 📋 **Planned Features**

- **Additional Instrument Types**: Guitar, synthesizer, and percussion expansion
- **Advanced Mixing Controls**: EQ, effects, and professional mixing capabilities
- **Community Leaderboards**: Global challenge rankings and achievement systems
- **Musical Notation Display**: Visual sheet music representation of compositions
- **Export Functionality**: Audio file export and sharing capabilities

## Contributing

Dhwani is built for the Reddit community! Contributions welcome:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** and test with `npm run dev`
4. **Submit a pull request** with detailed description

## Music Theory & Technical Notes

- **Audio Synthesis**: Uses Tone.js WebAudio for real-time sound generation
- **Timing Precision**: Sub-millisecond timing accuracy for musical synchronization
- **Data Compression**: Musical data optimized for Reddit's 4MB post limit
- **Browser Compatibility**: Works on all modern browsers with WebAudio support
- **Mobile Support**: Touch-optimized interfaces for mobile Reddit users

## License & Credits

Built with ❤️ for the Reddit music community. Powered by Devvit, Tone.js, and the creativity of Reddit users worldwide.

---

**Ready to make music together? Install Dhwani in your subreddit and start jamming! 🎵**
